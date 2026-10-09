<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Pembatas akses berdasarkan role.
 * Pemakaian di route: ->middleware(['auth:api', 'role:admin,paramedik'])
 */
class CheckRole
{
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = $request->user();

        if (! $user) {
            return response()->json([
                'success' => false,
                'message' => 'Sesi tidak valid. Silakan login kembali.',
            ], 401);
        }

        if (! $user->is_active) {
            return response()->json([
                'success' => false,
                'message' => 'Akun Anda tidak aktif. Hubungi admin.',
            ], 403);
        }

        if (! $user->hasRole(...$roles)) {
            return response()->json([
                'success' => false,
                'message' => 'Anda tidak memiliki hak akses untuk fitur ini.',
            ], 403);
        }

        return $next($request);
    }
}
