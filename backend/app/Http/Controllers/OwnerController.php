<?php

namespace App\Http\Controllers;

use App\Models\Owner;
use Illuminate\Http\Request;

class OwnerController extends Controller
{
    public function index()
    {
        return response()->json([
            'success' => true,
            'data' => Owner::latest()->get(),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'address' => ['required', 'string'],
            'phone' => [
                'required',
                'string',
                'max:20',
                'regex:/^\+?[0-9][0-9\s\-()]{7,19}$/',
            ],
            'email' => ['nullable', 'email', 'max:255'],
        ], [
            'name.required' => 'Nama pemilik wajib diisi.',
            'address.required' => 'Alamat pemilik wajib diisi.',
            'phone.required' => 'Nomor telepon wajib diisi.',
            'phone.regex' => 'Format nomor telepon tidak valid.',
            'email.email' => 'Format email tidak valid.',
        ]);

        $owner = Owner::create($validated);

        return response()->json([
            'success' => true,
            'message' => 'Data pemilik berhasil ditambahkan.',
            'data' => $owner,
        ], 201);
    }

    public function show(Owner $owner)
    {
        return response()->json([
            'success' => true,
            'data' => $owner,
        ]);
    }

    public function update(Request $request, Owner $owner)
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'address' => ['required', 'string'],
            'phone' => [
                'required',
                'string',
                'max:20',
                'regex:/^\+?[0-9][0-9\s\-()]{7,19}$/',
            ],
            'email' => ['nullable', 'email', 'max:255'],
        ], [
            'name.required' => 'Nama pemilik wajib diisi.',
            'address.required' => 'Alamat pemilik wajib diisi.',
            'phone.required' => 'Nomor telepon wajib diisi.',
            'phone.regex' => 'Format nomor telepon tidak valid.',
            'email.email' => 'Format email tidak valid.',
        ]);

        $owner->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Data pemilik berhasil diperbarui.',
            'data' => $owner->fresh(),
        ]);
    }

    public function destroy(Owner $owner)
    {
        $owner->delete();

        return response()->json([
            'success' => true,
            'message' => 'Data pemilik berhasil dihapus.',
        ]);
    }
}
