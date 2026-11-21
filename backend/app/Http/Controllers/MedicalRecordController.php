<?php

namespace App\Http\Controllers;

use App\Models\MedicalRecord;
use App\Models\Patient;
use Illuminate\Http\Request;

class MedicalRecordController extends Controller
{
    // Menyimpan catatan pemeriksaan SOAP
    public function store(Request $request, Patient $patient)
    {
        // Validasi data SOAP
        $validated = $request->validate([
            'subjective' => ['required', 'string'],
            'objective' => ['required', 'string'],
            'assessment' => ['required', 'string'],
            'plan' => ['required', 'string'],
        ]);

        // Simpan catatan medis milik pasien
        $medicalRecord = $patient->medicalRecords()->create([
            'user_id' => $request->user()->id,
            'subjective' => $validated['subjective'],
            'objective' => $validated['objective'],
            'assessment' => $validated['assessment'],
            'plan' => $validated['plan'],
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Catatan medis berhasil disimpan.',
            'data' => $medicalRecord->load('user:id,name,role'),
        ], 201);
    }

    // Memperbarui catatan pemeriksaan SOAP
    public function update(
        Request $request,
        Patient $patient,
        MedicalRecord $medicalRecord
    ) {
        // Pastikan catatan medis milik pasien yang dipilih
        $medicalRecord = $patient->medicalRecords()
            ->findOrFail($medicalRecord->id);

        // Validasi data SOAP
        $validated = $request->validate([
            'subjective' => ['required', 'string'],
            'objective' => ['required', 'string'],
            'assessment' => ['required', 'string'],
            'plan' => ['required', 'string'],
        ]);

        // Perbarui catatan medis
        $medicalRecord->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Catatan medis berhasil diperbarui.',
            'data' => $medicalRecord->load('user:id,name,role'),
        ]);
    }
}
