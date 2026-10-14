<?php

namespace App\Http\Controllers;

use App\Models\Service;
use Illuminate\Http\Request;

class ServiceController extends Controller
{
    public function index(Request $request)
    {
        $search = $request->query('search');
        $query  = Service::query();

        if ($search !== null && trim($search) !== '') {
            $query->where('name', 'like', '%' . trim($search) . '%');
        }

        $services = $query->latest()->get();

        if ($search !== null && trim($search) !== '' && $services->isEmpty()) {
            return response()->json([
                'success' => false,
                'message' => 'Data tidak ditemukan',
                'data'    => [],
            ]);
        }

        return response()->json([
            'success' => true,
            'data'    => $services,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name'        => ['required', 'string', 'max:100', 'unique:services,name'],
            'price'       => ['required', 'numeric', 'min:0'],
            'description' => ['nullable', 'string'],
        ], [
            'name.required'  => 'Nama layanan wajib diisi.',
            'name.unique'    => 'Nama layanan sudah ada.',
            'price.required' => 'Tarif layanan wajib diisi.',
            'price.min'      => 'Tarif tidak boleh negatif.',
        ]);

        $service = Service::create($validated);

        return response()->json([
            'success' => true,
            'message' => 'Data layanan berhasil ditambahkan.',
            'data'    => $service,
        ], 201);
    }

    public function show(Service $service)
    {
        return response()->json([
            'success' => true,
            'data'    => $service,
        ]);
    }

    public function update(Request $request, Service $service)
    {
        $validated = $request->validate([
            'name'        => ['required', 'string', 'max:100', 'unique:services,name,' . $service->id],
            'price'       => ['required', 'numeric', 'min:0'],
            'description' => ['nullable', 'string'],
            'is_active'   => ['nullable', 'boolean'],
        ], [
            'name.required'  => 'Nama layanan wajib diisi.',
            'name.unique'    => 'Nama layanan sudah ada.',
            'price.required' => 'Tarif layanan wajib diisi.',
            'price.min'      => 'Tarif tidak boleh negatif.',
        ]);

        $service->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Data layanan berhasil diperbarui.',
            'data'    => $service->fresh(),
        ]);
    }

    public function destroy(Service $service)
    {
        $service->delete();

        return response()->json([
            'success' => true,
            'message' => 'Data layanan berhasil dihapus.',
        ]);
    }
}
