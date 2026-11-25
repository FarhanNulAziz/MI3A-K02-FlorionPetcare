<?php

namespace App\Http\Controllers;

use App\Models\MedicalRecord;
use App\Models\MedicalRecordTreatment;
use App\Models\Medicine;
use App\Models\Prescription;
use App\Models\Treatment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class PrescriptionController extends Controller
{
    /**
     * Menampilkan resep dan tindakan pada satu rekam medis.
     */
    public function index(MedicalRecord $medicalRecord)
    {
        $medicalRecord->load(['prescriptions.medicine', 'treatmentItems.treatment']);

        return response()->json([
            'success' => true,
            'message' => 'Data resep dan tindakan berhasil ditemukan.',
            'data' => [
                'prescriptions' => $medicalRecord->prescriptions,
                'treatments' => $medicalRecord->treatmentItems,
            ],
        ]);
    }

    /**
     * Simpan resep dan tindakan sekaligus dalam satu transaksi.
     */
    public function store(Request $request, MedicalRecord $medicalRecord)
    {
        $rules = array_merge(
            [
                'items' => ['nullable', 'array'],
                'treatments' => ['nullable', 'array'],
            ],
            $this->itemRules('items.*'),
            $this->treatmentRules()
        );

        $messages = array_merge(
            $this->itemMessages('items.*'),
            $this->treatmentMessages(),
            [
                'items.array' => 'Daftar resep harus berupa array.',
                'treatments.array' => 'Daftar tindakan harus berupa array.',
            ]
        );

        $validated = $request->validate($rules, $messages);

        $items = $validated['items'] ?? [];
        $treatments = $validated['treatments'] ?? [];

        if (empty($items) && empty($treatments)) {
            throw ValidationException::withMessages([
                'items' => 'Minimal satu resep atau tindakan wajib diisi.',
            ]);
        }

        DB::transaction(function () use ($medicalRecord, $items, $treatments) {
            // Obat yang sama bisa muncul lebih dari sekali, jadi jumlahkan dulu.
            $totals = [];
            foreach ($items as $item) {
                $medicineId = (int) $item['medicine_id'];
                $totals[$medicineId] = ($totals[$medicineId] ?? 0) + (int) $item['quantity'];
            }

            $medicines = Medicine::whereIn('id', array_keys($totals))
                ->lockForUpdate()
                ->get()
                ->keyBy('id');

            foreach ($totals as $medicineId => $quantity) {
                $medicine = $medicines->get($medicineId);

                if (! $medicine) {
                    throw ValidationException::withMessages([
                        'items' => 'Obat tidak ditemukan.',
                    ]);
                }

                if (! $medicine->is_active) {
                    throw ValidationException::withMessages([
                        'items' => "Obat {$medicine->name} tidak aktif.",
                    ]);
                }

                if ($medicine->stock < $quantity) {
                    throw ValidationException::withMessages([
                        'items' => "Stok obat {$medicine->name} tidak cukup (tersisa {$medicine->stock}).",
                    ]);
                }
            }

            $masterTreatments = Treatment::whereIn('id', collect($treatments)->pluck('treatment_id')->all())
                ->lockForUpdate()
                ->get()
                ->keyBy('id');

            $seenNonRelative = [];
            $preparedTreatments = [];

            foreach ($treatments as $index => $item) {
                $treatmentId = (int) $item['treatment_id'];
                $master = $masterTreatments->get($treatmentId);

                if (! $master || ! $master->is_active) {
                    throw ValidationException::withMessages([
                        "treatments.$index.treatment_id" => 'Tindakan tidak ditemukan atau tidak aktif.',
                    ]);
                }

                $customName = null;
                if ($master->is_relative) {
                    $customName = trim((string) ($item['custom_name'] ?? ''));
                    if ($customName === '') {
                        throw ValidationException::withMessages([
                            "treatments.$index.custom_name" => 'Nama tindakan wajib diisi untuk Tindakan Lainnya.',
                        ]);
                    }
                } else {
                    if (isset($seenNonRelative[$treatmentId])) {
                        throw ValidationException::withMessages([
                            "treatments.$index.treatment_id" => "Tindakan {$master->name} sudah pernah dicatat pada rekam medis ini.",
                        ]);
                    }
                    $seenNonRelative[$treatmentId] = $master->name;
                }

                $consent = $this->consentData($item, $master, $index);

                $preparedTreatments[] = [
                    'treatment_id' => $treatmentId,
                    'custom_name' => $customName,
                    'price' => $this->resolvePrice($item, $master, $index),
                    'consent_given' => $consent['consent_given'],
                    'consent_by' => $consent['consent_by'],
                    'consent_at' => $consent['consent_at'],
                    'notes' => $item['notes'] ?? null,
                ];
            }

            if (! empty($seenNonRelative)) {
                $duplicates = MedicalRecordTreatment::where('medical_record_id', $medicalRecord->id)
                    ->whereIn('treatment_id', array_keys($seenNonRelative))
                    ->pluck('treatment_id')
                    ->all();

                if (! empty($duplicates)) {
                    $first = (int) $duplicates[0];
                    throw ValidationException::withMessages([
                        'treatments' => "Tindakan {$seenNonRelative[$first]} sudah pernah dicatat pada rekam medis ini.",
                    ]);
                }
            }

            // Semua validasi lulus, baru kurangi stok.
            foreach ($totals as $medicineId => $quantity) {
                $medicines->get($medicineId)->decrement('stock', $quantity);
            }

            foreach ($items as $item) {
                $medicalRecord->prescriptions()->create([
                    'medicine_id' => (int) $item['medicine_id'],
                    'quantity' => (int) $item['quantity'],
                    'dosage' => $item['dosage'],
                    'frequency' => $item['frequency'],
                    'duration_days' => $item['duration_days'] ?? null,
                    'must_finish' => filter_var($item['must_finish'] ?? false, FILTER_VALIDATE_BOOLEAN),
                    'instructions' => $item['instructions'] ?? null,
                ]);
            }

            foreach ($preparedTreatments as $treatment) {
                $medicalRecord->treatmentItems()->create($treatment);
            }
        });

        $medicalRecord->load(['prescriptions.medicine', 'treatmentItems.treatment']);

        return response()->json([
            'success' => true,
            'message' => 'Resep dan tindakan berhasil disimpan.',
            'data' => [
                'medical_record_id' => $medicalRecord->id,
                'prescriptions' => $medicalRecord->prescriptions,
                'treatments' => $medicalRecord->treatmentItems,
            ],
        ], 201);
    }

    /**
     * Ubah satu item resep dan sesuaikan selisih stoknya.
     */
    public function update(Request $request, Prescription $prescription)
    {
        $validated = $request->validate(
            array_merge($this->itemRules(), $this->itemMessages()),
            [
                'medicine_id.required' => 'Obat wajib dipilih.',
                'quantity.min' => 'Jumlah obat minimal 1.',
            ]
        );

        DB::transaction(function () use ($prescription, $validated) {
            $oldMedicineId = (int) $prescription->medicine_id;
            $oldQuantity = (int) $prescription->quantity;
            $newMedicineId = (int) $validated['medicine_id'];
            $newQuantity = (int) $validated['quantity'];

            $oldMedicine = Medicine::where('id', $oldMedicineId)->lockForUpdate()->firstOrFail();
            $newMedicine = $newMedicineId === $oldMedicineId
                ? $oldMedicine
                : Medicine::where('id', $newMedicineId)->lockForUpdate()->firstOrFail();

            if (! $newMedicine->is_active) {
                throw ValidationException::withMessages([
                    'medicine_id' => "Obat {$newMedicine->name} tidak aktif.",
                ]);
            }

            $available = $newMedicineId === $oldMedicineId
                ? $newMedicine->stock + $oldQuantity
                : $newMedicine->stock;

            if ($available < $newQuantity) {
                throw ValidationException::withMessages([
                    'quantity' => "Stok obat {$newMedicine->name} tidak cukup (tersisa {$available}).",
                ]);
            }

            if ($newMedicineId === $oldMedicineId) {
                $newMedicine->update(['stock' => $available - $newQuantity]);
            } else {
                $oldMedicine->increment('stock', $oldQuantity);
                $newMedicine->decrement('stock', $newQuantity);
            }

            $prescription->update([
                'medicine_id' => $newMedicineId,
                'quantity' => $newQuantity,
                'dosage' => $validated['dosage'],
                'frequency' => $validated['frequency'],
                'duration_days' => $validated['duration_days'] ?? null,
                'must_finish' => filter_var($validated['must_finish'] ?? false, FILTER_VALIDATE_BOOLEAN),
                'instructions' => $validated['instructions'] ?? null,
            ]);
        });

        return response()->json([
            'success' => true,
            'message' => 'Data resep berhasil diperbarui.',
            'data' => $prescription->fresh()->load('medicine'),
        ]);
    }

    /**
     * Hapus satu item resep dan kembalikan stok obatnya.
     */
    public function destroy(Prescription $prescription)
    {
        DB::transaction(function () use ($prescription) {
            $medicine = Medicine::where('id', $prescription->medicine_id)
                ->lockForUpdate()
                ->firstOrFail();

            $medicine->increment('stock', $prescription->quantity);
            $prescription->delete();
        });

        return response()->json([
            'success' => true,
            'message' => 'Resep berhasil dihapus dan stok obat dikembalikan.',
        ]);
    }

    /**
     * Hapus satu tindakan dari rekam medis.
     */
    public function destroyTreatment(MedicalRecordTreatment $medicalRecordTreatment)
    {
        $medicalRecordTreatment->delete();

        return response()->json([
            'success' => true,
            'message' => 'Tindakan berhasil dihapus.',
        ]);
    }

    /**
     * Aturan validasi satu item resep (dipakai store & update).
     */
    private function itemRules(string $prefix = ''): array
    {
        $rules = [
            'medicine_id' => ['required', 'integer', 'exists:medicines,id'],
            'quantity' => ['required', 'integer', 'min:1'],
            'dosage' => ['required', 'string', 'max:255'],
            'frequency' => ['required', 'string', 'max:255'],
            'duration_days' => ['nullable', 'integer', 'min:1'],
            'must_finish' => ['nullable', 'boolean'],
            'instructions' => ['nullable', 'string'],
        ];

        if ($prefix === '') {
            return $rules;
        }

        $prefixed = [];
        foreach ($rules as $field => $rule) {
            $prefixed[$prefix . '.' . $field] = $rule;
        }

        return $prefixed;
    }

    /**
     * Aturan validasi entri tindakan.
     */
    private function treatmentRules(): array
    {
        return [
            'treatments.*.treatment_id' => ['required', 'integer', 'exists:treatments,id'],
            'treatments.*.custom_name' => ['nullable', 'string', 'max:150'],
            'treatments.*.price' => ['nullable', 'numeric', 'min:0'],
            'treatments.*.consent_given' => ['nullable', 'boolean'],
            'treatments.*.consent_by' => ['nullable', 'string', 'max:150'],
            'treatments.*.notes' => ['nullable', 'string'],
        ];
    }

    /**
     * Pesan validasi item resep dalam Bahasa Indonesia.
     */
    private function itemMessages(string $prefix = ''): array
    {
        $messages = [
            'medicine_id.required' => 'Obat wajib dipilih.',
            'medicine_id.exists' => 'Obat tidak ditemukan.',
            'quantity.required' => 'Jumlah obat wajib diisi.',
            'quantity.integer' => 'Jumlah obat harus berupa bilangan bulat.',
            'quantity.min' => 'Jumlah obat minimal 1.',
            'dosage.required' => 'Dosis wajib diisi.',
            'frequency.required' => 'Frekuensi pemakaian wajib diisi.',
            'must_finish.boolean' => 'Penanda wajib dihabiskan harus berupa boolean.',
        ];

        if ($prefix === '') {
            return $messages;
        }

        $prefixed = [];
        foreach ($messages as $key => $message) {
            [$field, $rule] = explode('.', $key, 2);
            $prefixed[$prefix . '.' . $field . '.' . $rule] = $message;
        }

        return $prefixed;
    }

    /**
     * Pesan validasi entri tindakan dalam Bahasa Indonesia.
     */
    private function treatmentMessages(): array
    {
        return [
            'treatments.*.treatment_id.required' => 'Tindakan wajib dipilih.',
            'treatments.*.treatment_id.exists' => 'Tindakan tidak ditemukan.',
            'treatments.*.custom_name.max' => 'Nama tindakan maksimal 150 karakter.',
            'treatments.*.price.numeric' => 'Tarif harus berupa angka.',
            'treatments.*.price.min' => 'Tarif tidak boleh negatif.',
            'treatments.*.consent_by.max' => 'Nama pemilik/wali maksimal 150 karakter.',
        ];
    }

    /**
     * Cek nilai yang benar-benar diisi (bukan null / string kosong).
     */
    private function isFilled(mixed $value): bool
    {
        return $value !== null && $value !== '';
    }

    /**
     * Tentukan tarif tindakan berdasarkan master.
     */
    private function resolvePrice(array $item, Treatment $master, int $index): string
    {
        $min = $master->price_min !== null ? (float) $master->price_min : null;
        $max = $master->price_max !== null ? (float) $master->price_max : null;
        $price = $item['price'] ?? null;

        if ($master->is_relative) {
            if (! $this->isFilled($price)) {
                throw ValidationException::withMessages([
                    "treatments.$index.price" => 'Tarif tindakan wajib diisi.',
                ]);
            }

            return number_format((float) $price, 2, '.', '');
        }

        // Tarif tetap: harga diambil dari master, boleh dikirim tapi harus sama.
        if ($min !== null && $max !== null && $min == $max) {
            if ($this->isFilled($price) && (float) $price !== $min) {
                throw ValidationException::withMessages([
                    "treatments.$index.price" => "Tarif {$master->name} tetap Rp " . number_format($min, 0, ',', '.') . '.',
                ]);
            }

            return $master->price_min;
        }

        // Tarif rentang: dokter wajib menentukan price di dalam rentang master.
        if ($min !== null && $max !== null) {
            if (! $this->isFilled($price)) {
                throw ValidationException::withMessages([
                    "treatments.$index.price" => "Tarif {$master->name} wajib diisi.",
                ]);
            }

            $value = (float) $price;
            if ($value < $min || $value > $max) {
                throw ValidationException::withMessages([
                    "treatments.$index.price" => "Tarif {$master->name} harus antara Rp " . number_format($min, 0, ',', '.') . ' dan Rp ' . number_format($max, 0, ',', '.') . '.',
                ]);
            }

            return number_format($value, 2, '.', '');
        }

        if (! $this->isFilled($price)) {
            throw ValidationException::withMessages([
                "treatments.$index.price" => "Tarif {$master->name} wajib diisi.",
            ]);
        }

        return number_format((float) $price, 2, '.', '');
    }

    /**
     * Validasi informed consent. consent_at selalu diisi server.
     */
    private function consentData(array $item, Treatment $master, int $index): array
    {
        $given = filter_var($item['consent_given'] ?? false, FILTER_VALIDATE_BOOLEAN);

        if ($master->requires_consent && ! $given) {
            throw ValidationException::withMessages([
                "treatments.$index.consent_given" => "Tindakan {$master->name} memerlukan persetujuan pemilik hewan.",
            ]);
        }

        if (! $given) {
            return [
                'consent_given' => false,
                'consent_by' => null,
                'consent_at' => null,
            ];
        }

        $by = trim((string) ($item['consent_by'] ?? ''));
        if ($by === '') {
            throw ValidationException::withMessages([
                "treatments.$index.consent_by" => 'Nama pemilik/wali wajib diisi saat memberikan persetujuan.',
            ]);
        }

        return [
            'consent_given' => true,
            'consent_by' => $by,
            'consent_at' => now(),
        ];
    }
}
