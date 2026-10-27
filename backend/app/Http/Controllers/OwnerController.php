<?php

namespace App\Http\Controllers;

use App\Models\Owner;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Database\QueryException;

class OwnerController extends Controller
{
    public function index(Request $request)
    {
        $search = $request->query('search');
        $query = Owner::query();

        if ($search) {
            $query->where('name', 'like', "%{$search}%")
                  ->orWhere('phone', 'like', "%{$search}%");
        }

        return response()->json([
            'success' => true,
            'data'    => $query->orderBy('name')->get()
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name'    => 'required|string|max:100',
            'phone'   => 'required|string|max:20',
            'email'   => 'required|email|max:100',
            'address' => 'required|string',
        ]);

        $owner = Owner::create($validated);

        User::firstOrCreate(
            ['email' => $owner->email],
            [
                'name'      => $owner->name,
                'password'  => Hash::make('pemilik123'),
                'role'      => 'pemilik',
                'is_active' => true,
            ]
        );

        return response()->json([
            'success' => true,
            'message' => 'Data pemilik dan akun login berhasil dibuat.',
            'data'    => $owner,
        ], 201);
    }

    public function show($id)
    {
        $owner = Owner::findOrFail($id);
        return response()->json(['success' => true, 'data' => $owner]);
    }

    public function update(Request $request, $id)
    {
        $owner = Owner::findOrFail($id);

        $validated = $request->validate([
            'name'    => 'required|string|max:100',
            'phone'   => 'required|string|max:20',
            'email'   => 'required|email|max:100',
            'address' => 'required|string',
        ]);

        $oldEmail = $owner->email;
        $owner->update($validated);

        if ($oldEmail !== $owner->email) {
            $user = User::where('email', $oldEmail)->first();
            if ($user) {
                $user->update([
                    'email' => $owner->email,
                    'name'  => $owner->name
                ]);
            }
        }

        return response()->json([
            'success' => true,
            'message' => 'Data pemilik berhasil diperbarui.',
            'data'    => $owner,
        ]);
    }

    public function destroy($id)
    {
        $owner = Owner::findOrFail($id);

        try {
            // Hapus akun login-nya terlebih dahulu
            User::where('email', $owner->email)->delete();

            // Hapus data pemilik
            $owner->delete();

            return response()->json([
                'success' => true,
                'message' => 'Data pemilik dan akun login berhasil dihapus.',
            ]);
        } catch (QueryException $e) {
            // Jika error code 23000, berarti melanggar Foreign Key (masih punya hewan)
            if ($e->getCode() == "23000") {
                return response()->json([
                    'success' => false,
                    'message' => 'Gagal menghapus! Pemilik ini masih memiliki data hewan terdaftar. Hapus data hewannya terlebih dahulu di menu Pasien.',
                ], 400);
            }

            // Tampilkan error sistem jika ada masalah lain
            return response()->json([
                'success' => false,
                'message' => 'Error Sistem: ' . $e->getMessage(),
            ], 500);
        }
    }
}
