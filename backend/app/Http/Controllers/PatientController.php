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
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'species' => [
                'required',
                'string',
                Rule::in(['Anjing', 'Kucing', 'Kelinci', 'Hamster', 'Burung', 'Lainnya']),
            ],
            'gender' => [
                'required',
                'string',
                Rule::in(['Jantan', 'Betina']),
            ],
            'breed' => ['nullable', 'string', 'max:255'],
            'age' => ['required', 'integer', 'min:1'],
            'weight' => ['required', 'numeric', 'gt:0'],
            'owner_id' => ['required', 'integer', 'exists:owners,id'],
            'notes' => ['nullable', 'string'],
        ], [
            'name.required' => 'Nama hewan wajib diisi.',
            'species.required' => 'Jenis hewan wajib dipilih.',
            'gender.required' => 'Jenis kelamin wajib dipilih.',
            'age.required' => 'Umur hewan wajib diisi.',
            'age.min' => 'Umur hewan minimal 1 bulan.',
            'weight.required' => 'Berat hewan wajib diisi.',
            'weight.gt' => 'Berat hewan harus lebih dari 0 kg.',
            'owner_id.required' => 'Pemilik wajib dipilih.',
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
                Rule::in(['Anjing', 'Kucing', 'Kelinci', 'Hamster', 'Burung', 'Lainnya']),
            ],
            'gender' => [
                'required',
                'string',
                Rule::in(['Jantan', 'Betina']),
            ],
            'breed' => ['nullable', 'string', 'max:255'],
            'age' => ['required', 'integer', 'min:1'],
            'weight' => ['required', 'numeric', 'gt:0'],
            'owner_id' => ['required', 'integer', 'exists:owners,id'],
            'notes' => ['nullable', 'string'],
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
