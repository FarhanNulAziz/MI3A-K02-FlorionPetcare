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

        // JIKA YANG LOGIN ADALAH PEMILIK, HANYA TAMPILKAN HEWANNYA SENDIRI
        if ($user->role === 'pemilik') {
            $owner = Owner::where('email', $user->email)->first();
            if ($owner) {
                $query->where('owner_id', $owner->id);
            } else {
                return response()->json(['success' => true, 'data' => []]);
            }
        }

        // Fitur Pencarian
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
            'breed' => ['nullable', 'string', 'max:255'],
            'age' => ['required', 'integer', 'min:1'],
            'weight' => ['required', 'numeric', 'gt:0'],
            'notes' => ['nullable', 'string'],
        ];

        // Jika yang login BUKAN pemilik (Admin/Dokter), wajib pilih owner_id
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

        // JIKA YANG LOGIN ADALAH PEMILIK, OTOMATIS IKAT KE DIRINYA SENDIRI
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
            'breed' => ['nullable', 'string', 'max:255'],
            'age' => ['required', 'integer', 'min:1'],
            'weight' => ['required', 'numeric', 'gt:0'],
            'notes' => ['nullable', 'string'],
        ];

        if ($user->role !== 'pemilik') {
            $rules['owner_id'] = ['required', 'integer', 'exists:owners,id'];
        }

        $validated = $request->validate($rules);

        // JIKA PEMILIK, JANGAN BIARKAN MEREKA MEMINDAHKAN HEWAN KE PEMILIK LAIN
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

    public function destroy(Patient $patient)
    {
        $patient->delete();

        return response()->json([
            'success' => true,
            'message' => 'Data pasien berhasil dihapus.',
        ]);
    }
}
