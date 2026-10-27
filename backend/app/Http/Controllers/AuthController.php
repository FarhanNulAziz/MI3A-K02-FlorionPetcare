<?php

namespace App\Http\Controllers;

use App\Http\Requests\Auth\LoginRequest;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Tymon\JWTAuth\JWTGuard;

class AuthController extends Controller
{
    public function login(LoginRequest $request): JsonResponse
    {
        $credentials = $request->only('email', 'password');

        if (! $token = $this->guard()->attempt($credentials)) {
            return response()->json([
                'success' => false,
                'message' => 'Email atau password salah',
            ], 401);
        }

        /** @var User $user */
        $user = $this->guard()->user();

        if (! $user->is_active) {
            $this->guard()->logout();
            return response()->json([
                'success' => false,
                'message' => 'Akun Anda tidak aktif. Hubungi admin.',
            ], 403);
        }

        return $this->respondWithToken($token, $user, 'Login berhasil');
    }

    public function register(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name'     => 'required|string|max:255',
            'email'    => 'required|string|email|max:255|unique:users',
            'password' => 'required|string|min:6',
        ]);

        $user = User::create([
            'name'     => $validated['name'],
            'email'    => $validated['email'],
            'password' => Hash::make($validated['password']),
            'role'     => 'pemilik', // DIPAKSA HANYA BISA PEMILIK
            'is_active'=> true,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Registrasi berhasil. Silakan login.',
        ], 201);
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
            'expires_in' => $this->guard()->factory()->getTTL() * 60,
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
