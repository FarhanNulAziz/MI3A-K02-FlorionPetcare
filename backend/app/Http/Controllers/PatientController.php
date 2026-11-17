<?php

namespace App\Http\Controllers;

use App\Models\Patient;
use App\Models\Owner;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class PatientController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $search = $request->query('search');
        $query = Patient::with('owner');

        if ($user->role === 'pemilik') {
            $owner = Owner::where('email', $user->email)->first();
            if ($owner) {
                $query->where('owner_id', $owner->id);
            } else {
                return response()->json(['success' => true, 'data' => []]);
            }
        }

        if ($search) {
            $query->where('name', 'like', '%' . trim($search) . '%');
        }

        return response()->json([
            'success' => true,
            'data' => $query->latest()->get(),
        ]);
    }

    public function store(Request $request)
    {
        $user = $request->user();

        $rules = [
            'name' => ['required', 'string', 'max:255'],
            'species' => ['required', 'string', Rule::in(['Anjing', 'Kucing', 'Kelinci', 'Lainnya'])],
            'gender' => ['required', 'string', Rule::in(['Jantan', 'Betina'])],
            'age' => ['required', 'integer', 'min:1'],
            'weight' => ['required', 'numeric', 'gt:0'],
            'temperature' => ['nullable', 'numeric'],
            'special_marks' => ['nullable', 'string'],
            'breed' => ['nullable', 'string', 'max:255'],
            'notes' => ['nullable', 'string'],
        ];

        if ($user->role !== 'pemilik') {
            $rules['owner_id'] = ['required', 'integer', 'exists:owners,id'];
        }

        $validated = $request->validate($rules, [
            'name.required' => 'Nama hewan wajib diisi.',
            'species.required' => 'Jenis hewan wajib dipilih.',
            'gender.required' => 'Jenis kelamin wajib dipilih.',
            'age.required' => 'Umur hewan wajib diisi.',
            'age.min' => 'Umur hewan minimal 1 bulan.',
            'weight.required' => 'Berat hewan wajib diisi.',
            'weight.gt' => 'Berat hewan harus lebih dari 0 kg.',
            'owner_id.required' => 'Pemilik wajib dipilih.',
        ]);

        if ($user->role === 'pemilik') {
            $owner = Owner::firstOrCreate(
                ['email' => $user->email],
                [
                    'name' => $user->name,
                    'phone' => '-',
                    'address' => '-',
                ]
            );
            $validated['owner_id'] = $owner->id;
        }

        $patient = Patient::create($validated);

        return response()->json([
            'success' => true,
            'message' => 'Data pasien berhasil ditambahkan.',
            'data' => $patient->load('owner'),
        ], 201);
    }

    public function show(Patient $patient)
    {
        return response()->json([
            'success' => true,
            'data' => $patient->load('owner'),
        ]);
    }

    public function update(Request $request, Patient $patient)
    {
        $user = $request->user();

        $rules = [
            'name' => ['required', 'string', 'max:255'],
            'species' => ['required', 'string', Rule::in(['Anjing', 'Kucing', 'Kelinci', 'Lainnya'])],
            'gender' => ['required', 'string', Rule::in(['Jantan', 'Betina'])],
            'age' => ['required', 'integer', 'min:1'],
            'weight' => ['required', 'numeric', 'gt:0'],
            'temperature' => ['nullable', 'numeric'],
            'special_marks' => ['nullable', 'string'],
            'breed' => ['nullable', 'string', 'max:255'],
            'notes' => ['nullable', 'string'],
        ];

        if ($user->role !== 'pemilik') {
            $rules['owner_id'] = ['required', 'integer', 'exists:owners,id'];
        }

        $validated = $request->validate($rules);

        if ($user->role === 'pemilik') {
            unset($validated['owner_id']);
        }

        $patient->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Data pasien berhasil diperbarui.',
            'data' => $patient->fresh()->load('owner'),
        ]);
    }


    /**
     * Menampilkan riwayat medis pasien.
     *
     * Mendukung filter berdasarkan tanggal pencatatan.
     */
    public function medicalRecords(Request $request, Patient $patient)
    {
        // Validasi filter tanggal jika dikirimkan.
        $validated = $request->validate([
            'date' => ['sometimes', 'date_format:Y-m-d'],
        ]);

        // Ambil riwayat medis berdasarkan pasien.
        $query = $patient->medicalRecords()
            ->with('user:id,name,role');

        // Filter berdasarkan tanggal pencatatan.
        if (!empty($validated['date'])) {
            $query->whereDate('created_at', $validated['date']);
        }

        // Urutkan secara kronologis (terlama ke terbaru).
        $medicalRecords = $query
            ->orderBy('created_at', 'asc')
            ->get();

        // Jika belum ada riwayat medis.
        if ($medicalRecords->isEmpty()) {
            return response()->json([
                'success' => true,
                'message' => 'Belum ada riwayat',
                'data' => [],
            ]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Riwayat medis berhasil ditemukan.',
            'data' => $medicalRecords,
        ]);
    }


    public function destroy(Patient $patient)
    {
        $patient->delete();

        return response()->json([
            'success' => true,
            'message' => 'Data pasien berhasil dihapus.',
        ]);
    }
}
