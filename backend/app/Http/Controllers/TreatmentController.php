<?php

namespace App\Http\Controllers;

use App\Models\Treatment;
use Illuminate\Http\Request;

class TreatmentController extends Controller
{
    /**
     * Daftar tindakan aktif untuk dropdown FE.
     */
    public function index(Request $request)
    {
        $search = $request->query('search');
        $query = Treatment::where('is_active', true);

        if ($search !== null && trim($search) !== '') {
            $query->where('name', 'like', '%' . trim($search) . '%');
        }

        return response()->json([
            'success' => true,
            'data' => $query->latest()->get(),
        ]);
    }
}
