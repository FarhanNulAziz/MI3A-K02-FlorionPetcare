<?php

namespace App\Http\Controllers;

use App\Http\Requests\Auth\LoginRequest;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Tymon\JWTAuth\JWTGuard;

class AuthController extends Controller
{
    public function login(LoginRequest $request): JsonResponse
    {
        $credentials = $request->only('email', 'password');

        // Pesan sengaja sama untuk email tidak terdaftar maupun password salah.
        if (! $token = $this->guard()->attempt($credentials)) {
            return response()->json([
                'success' => false,
                'message' => 'Email atau password salah',
            ], 401);
        }

        /** @var User $user */
        $user = $this->guard()->user();

        if (! $user->is_active) {
            $this->guard()->logout(); // batalkan token yang baru dibuat

            return response()->json([
                'success' => false,
                'message' => 'Akun Anda tidak aktif. Hubungi admin.',
            ], 403);
        }

        return $this->respondWithToken($token, $user, 'Login berhasil');
    }

    public function me(): JsonResponse
    {
        /** @var User $user */
        $user = $this->guard()->user();

        return response()->json([
            'success' => true,
            'user' => $this->userPayload($user),
            'menus' => $user->menus(),
        ]);
    }

    public function logout(): JsonResponse
    {
        $this->guard()->logout();

        return response()->json([
            'success' => true,
            'message' => 'Berhasil keluar',
        ]);
    }
    public function refresh(): JsonResponse
    {
        $token = $this->guard()->refresh();

        /** @var User $user */
        $user = $this->guard()->setToken($token)->user();

        return $this->respondWithToken($token, $user, 'Token diperbarui');
    }

    private function guard(): JWTGuard
    {
        /** @var JWTGuard $guard */
        $guard = Auth::guard('api');

        return $guard;
    }
    private function respondWithToken(string $token, User $user, string $message): JsonResponse
    {
        return response()->json([
            'success' => true,
            'message' => $message,
            'user' => $this->userPayload($user),
            'menus' => $user->menus(),
            'access_token' => $token,
            'token_type' => 'bearer',
            'expires_in' => $this->guard()->factory()->getTTL() * 60, // detik
        ]);
    }

    private function userPayload(User $user): array
    {
        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'role' => $user->role,
        ];
    }
}
