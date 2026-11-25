<?php

namespace App\Http\Controllers;

use App\Models\Medicine;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class MedicineController extends Controller
{
    /**
     * Daftar obat aktif untuk dropdown (bisa dicari berdasarkan nama).
     */
    public function index(Request $request)
    {
        $search = $request->query('search');
        $query = Medicine::where('is_active', true);

        if ($search !== null && trim($search) !== '') {
            $query->where('name', 'like', '%' . trim($search) . '%');
        }

        return response()->json([
            'success' => true,
            'data' => $query->latest()->get(),
        ]);
    }

    /**
     * Tambah obat baru ke master.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:100', Rule::unique('medicines', 'name')],
            'unit' => ['required', 'string', 'max:30'],
            'stock' => ['required', 'integer', 'min:0'],
            'description' => ['nullable', 'string'],
            'is_active' => ['nullable', 'boolean'],
        ], [
            'name.required' => 'Nama obat wajib diisi.',
            'name.unique' => 'Nama obat sudah ada.',
            'unit.required' => 'Satuan obat wajib diisi.',
            'stock.required' => 'Stok obat wajib diisi.',
            'stock.integer' => 'Stok obat harus berupa bilangan bulat.',
            'stock.min' => 'Stok obat tidak boleh negatif.',
        ]);

        $medicine = Medicine::create($validated);

        return response()->json([
            'success' => true,
            'message' => 'Data obat berhasil ditambahkan.',
            'data' => $medicine,
        ], 201);
    }

    /**
     * Ubah data master atau stok obat.
     */
    public function update(Request $request, Medicine $medicine)
    {
        $validated = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:100', Rule::unique('medicines', 'name')->ignore($medicine->id)],
            'unit' => ['sometimes', 'required', 'string', 'max:30'],
            'stock' => ['sometimes', 'required', 'integer', 'min:0'],
            'description' => ['sometimes', 'nullable', 'string'],
            'is_active' => ['sometimes', 'boolean'],
        ], [
            'name.required' => 'Nama obat wajib diisi.',
            'name.unique' => 'Nama obat sudah ada.',
            'unit.required' => 'Satuan obat wajib diisi.',
            'stock.required' => 'Stok obat wajib diisi.',
            'stock.integer' => 'Stok obat harus berupa bilangan bulat.',
            'stock.min' => 'Stok obat tidak boleh negatif.',
        ]);

        $medicine->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Data obat berhasil diperbarui.',
            'data' => $medicine->fresh(),
        ]);
    }

    /**
     * Hapus obat. Jika sudah dipakai resep, obat hanya dinonaktifkan agar riwayat tetap utuh.
     */
    public function destroy(Medicine $medicine)
    {
        if ($medicine->prescriptions()->exists()) {
            $medicine->update(['is_active' => false]);

            return response()->json([
                'success' => true,
                'message' => 'Obat sudah digunakan dalam resep, master dinonaktifkan.',
            ]);
        }

        $medicine->delete();

        return response()->json([
            'success' => true,
            'message' => 'Data obat berhasil dihapus.',
        ]);
    }
}
