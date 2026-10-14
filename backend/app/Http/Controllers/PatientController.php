<?php

namespace App\Http\Controllers;

use App\Models\Patient;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class PatientController extends Controller
{
    public function index(Request $request)
{
    $search = $request->query('search');

    $query = Patient::with('owner');

    if ($search !== null && trim($search) !== '') {
        $query->where('name', 'like', '%' . trim($search) . '%');
    }

    $patients = $query->latest()->get();

    if ($search !== null && trim($search) !== '' && $patients->isEmpty()) {
        return response()->json([
            'success' => false,
            'message' => 'Data tidak ditemukan',
            'data' => [],
        ]);
    }

    return response()->json([
        'success' => true,
        'data' => $patients,
    ]);
}

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'species' => [
                'required',
                'string',
                'max:100',
                Rule::in(['Anjing', 'Kucing', 'Kelinci', 'Lainnya']),
            ],
            'breed' => ['nullable', 'string', 'max:255'],
            'age' => ['required', 'integer', 'min:1'],
            'weight' => ['required', 'numeric', 'gt:0', 'decimal:0,2'],
            'owner_id' => ['required', 'integer', 'exists:owners,id'],
            'notes' => ['nullable', 'string'],
        ], [
            'name.required' => 'Nama hewan wajib diisi.',
            'species.required' => 'Jenis hewan wajib dipilih.',
            'species.in' => 'Jenis hewan tidak valid.',
            'age.required' => 'Umur hewan wajib diisi.',
            'age.min' => 'Umur hewan harus lebih dari 0.',
            'weight.required' => 'Berat hewan wajib diisi.',
            'weight.gt' => 'Berat hewan harus lebih dari 0 kg.',
            'owner_id.required' => 'Pemilik wajib dipilih.',
            'owner_id.exists' => 'Pemilik yang dipilih tidak ditemukan.',
        ]);

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
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'species' => [
                'required',
                'string',
                'max:100',
                Rule::in(['Anjing', 'Kucing', 'Kelinci', 'Lainnya']),
            ],
            'breed' => ['nullable', 'string', 'max:255'],
            'age' => ['required', 'integer', 'min:1'],
            'weight' => ['required', 'numeric', 'gt:0', 'decimal:0,2'],
            'owner_id' => ['required', 'integer', 'exists:owners,id'],
            'notes' => ['nullable', 'string'],
        ], [
            'name.required' => 'Nama hewan wajib diisi.',
            'species.required' => 'Jenis hewan wajib dipilih.',
            'species.in' => 'Jenis hewan tidak valid.',
            'age.required' => 'Umur hewan wajib diisi.',
            'age.min' => 'Umur hewan harus lebih dari 0.',
            'weight.required' => 'Berat hewan wajib diisi.',
            'weight.gt' => 'Berat hewan harus lebih dari 0 kg.',
            'owner_id.required' => 'Pemilik wajib dipilih.',
            'owner_id.exists' => 'Pemilik yang dipilih tidak ditemukan.',
        ]);

        $patient->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Data pasien berhasil diperbarui.',
            'data' => $patient->fresh()->load('owner'),
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
