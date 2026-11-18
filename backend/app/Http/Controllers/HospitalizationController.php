<?php

namespace App\Http\Controllers;

use App\Models\Hospitalization;
use Illuminate\Http\Request;

class HospitalizationController extends Controller
{
    // 1. Ambil daftar pasien rawat inap (bisa difilter ?status=inpatient atau discharged)
    public function index(Request $request)
    {
        $query = Hospitalization::with(['patient.owner', 'dailyMonitorings'])
            ->latest();

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        return response()->json([
            'status' => 'success',
            'data' => $query->get(),
        ]);
    }

    // 2. Detail 1 data rawat inap beserta riwayat monitoring hariannya
    public function show($id)
    {
        $hospitalization = Hospitalization::with(['patient.owner', 'dailyMonitorings'])
            ->findOrFail($id);

        return response()->json([
            'status' => 'success',
            'data' => $hospitalization,
        ]);
    }

    // 3. Pendaftaran pasien rawat inap (Paket 35rb/50rb & pilih kandang)
    public function store(Request $request)
    {
        $validated = $request->validate([
            'patient_id' => 'required|exists:patients,id',
            'package_price_per_day' => 'required|integer|in:35000,50000',
            'cage_number' => 'required|string|max:50',
            'admission_date' => 'required|date',
        ]);

        // Cegah pasien yang masih berstatus inpatient didaftarkan ulang
        $alreadyInpatient = Hospitalization::where('patient_id', $validated['patient_id'])
            ->where('status', 'inpatient')
            ->exists();

        if ($alreadyInpatient) {
            return response()->json([
                'status' => 'error',
                'message' => 'Pasien ini masih berstatus sedang dirawat inap.',
            ], 422);
        }

        // Cek apakah kandang sedang dipakai pasien lain
        $cageOccupied = Hospitalization::where('cage_number', $validated['cage_number'])
            ->where('status', 'inpatient')
            ->exists();

        if ($cageOccupied) {
            return response()->json([
                'status' => 'error',
                'message' => 'Nomor kandang tersebut sedang digunakan.',
            ], 422);
        }

        $hospitalization = Hospitalization::create([
            ...$validated,
            'status' => 'inpatient',
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Pendaftaran rawat inap berhasil.',
            'data' => $hospitalization->load('patient'),
        ], 201);
    }

    // 4. Tambah catatan Daily Monitoring
    public function storeMonitoring(Request $request, $id)
    {
        $hospitalization = Hospitalization::findOrFail($id);

        if ($hospitalization->status !== 'inpatient') {
            return response()->json([
                'status' => 'error',
                'message' => 'Pasien sudah pulang (discharged), tidak bisa menambah monitoring.',
            ], 422);
        }

        $validated = $request->validate([
            'monitoring_date' => 'required|date',
            'appetite' => 'nullable|string|max:100',
            'pip' => 'nullable|string',
            'pup' => 'nullable|string',
            'vomiting' => 'boolean',
            'diarrhea' => 'boolean',
            'notes' => 'nullable|string',
        ]);

        $monitoring = $hospitalization->dailyMonitorings()->create([
            'monitoring_date' => $validated['monitoring_date'],
            'appetite' => $validated['appetite'] ?? null,
            'pip' => $validated['pip'] ?? null,
            'pup' => $validated['pup'] ?? null,
            'vomiting' => $validated['vomiting'] ?? false,
            'diarrhea' => $validated['diarrhea'] ?? false,
            'notes' => $validated['notes'] ?? null,
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Data monitoring harian berhasil disimpan.',
            'data' => $monitoring,
        ], 201);
    }

    // 5. Pasien pulang (Discharge) & hitung total biaya inap
    public function discharge(Request $request, $id)
    {
        $hospitalization = Hospitalization::findOrFail($id);

        if ($hospitalization->status === 'discharged') {
            return response()->json([
                'status' => 'error',
                'message' => 'Pasien sudah dipulangkan sebelumnya.',
            ], 422);
        }

        $validated = $request->validate([
            'discharge_date' => 'required|date|after_or_equal:' . $hospitalization->admission_date,
        ]);

        $hospitalization->update([
            'discharge_date' => $validated['discharge_date'],
            'status' => 'discharged',
        ]);

        // Hitung lama hari rawat (minimal 1 hari)
        $days = max(1, \Carbon\Carbon::parse($hospitalization->admission_date)
            ->diffInDays(\Carbon\Carbon::parse($validated['discharge_date'])));
        $totalCost = $days * $hospitalization->package_price_per_day;

        return response()->json([
            'status' => 'success',
            'message' => 'Pasien berhasil dipulangkan.',
            'data' => $hospitalization,
            'billing_summary' => [
                'total_days' => $days,
                'total_cost' => $totalCost,
            ],
        ]);
    }
}
