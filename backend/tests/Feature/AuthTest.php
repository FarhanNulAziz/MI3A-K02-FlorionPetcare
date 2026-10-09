<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Route;
use Tests\TestCase;

class AuthTest extends TestCase
{
    use RefreshDatabase;

    private function makeUser(string $role = 'admin', bool $active = true, string $email = 'user@florion.com'): User
    {
        return User::create([
            'name' => 'User Uji',
            'email' => $email,
            'password' => Hash::make('password123'),
            'role' => $role,
            'is_active' => $active,
        ]);
    }

    /**
     * Di produksi setiap request = proses PHP baru. Di test, banyak request berbagi satu
     * aplikasi, jadi objek JWT (singleton) & guard perlu di-reset agar tidak "mengingat"
     * token request sebelumnya.
     */
    private function resetAuthState(): void
    {
        $this->app->forgetInstance('tymon.jwt');
        $this->app->forgetInstance('tymon.jwt.auth');
        $this->app['auth']->forgetGuards();
    }

    private function loginToken(User $user): string
    {
        return $this->postJson('/api/login', [
            'email' => $user->email,
            'password' => 'password123',
        ])->json('access_token');
    }

    public function test_login_berhasil_mengembalikan_token_role_dan_menu(): void
    {
        $this->makeUser('admin');

        $this->postJson('/api/login', ['email' => 'user@florion.com', 'password' => 'password123'])
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('user.role', 'admin')
            ->assertJsonPath('token_type', 'bearer')
            ->assertJsonStructure(['access_token', 'expires_in', 'menus'])
            ->assertJsonMissingPath('user.password');
    }

    public function test_email_kosong_menampilkan_pesan_wajib_diisi(): void
    {
        $this->postJson('/api/login', ['email' => '', 'password' => 'abc'])
            ->assertStatus(422)
            ->assertJsonPath('errors.email.0', 'Email wajib diisi');
    }

    public function test_password_kosong_menampilkan_pesan_wajib_diisi(): void
    {
        $this->postJson('/api/login', ['email' => 'a@b.com'])
            ->assertStatus(422)
            ->assertJsonPath('errors.password.0', 'Password wajib diisi');
    }

    public function test_format_email_salah(): void
    {
        $this->postJson('/api/login', ['email' => 'bukan-email', 'password' => 'abc'])
            ->assertStatus(422)
            ->assertJsonPath('errors.email.0', 'Format email salah');
    }

    public function test_password_salah_dan_email_tidak_terdaftar_pesannya_sama(): void
    {
        $this->makeUser();

        $salah = $this->postJson('/api/login', ['email' => 'user@florion.com', 'password' => 'salah123']);
        $tidakAda = $this->postJson('/api/login', ['email' => 'tidakada@florion.com', 'password' => 'password123']);

        $salah->assertStatus(401)->assertJsonPath('message', 'Email atau password salah');
        $tidakAda->assertStatus(401)->assertJsonPath('message', 'Email atau password salah');
    }

    public function test_akun_nonaktif_tidak_bisa_login(): void
    {
        $this->makeUser('dokter', false);

        $this->postJson('/api/login', ['email' => 'user@florion.com', 'password' => 'password123'])
            ->assertStatus(403)
            ->assertJsonMissingPath('access_token');
    }

    public function test_menu_sesuai_role(): void
    {
        $keys = fn(string $role) => collect($this->makeUser($role, true, "$role@florion.com")->menus())->pluck('key')->all();

        $this->assertSame(['beranda', 'pemilik', 'pasien', 'layanan', 'profil'], $keys('admin'));
        $this->assertSame(['beranda', 'pemilik', 'pasien', 'layanan', 'profil'], $keys('paramedik'));
        $this->assertSame(['beranda', 'pasien', 'riwayat', 'profil'], $keys('dokter'));
        $this->assertSame(['beranda', 'laporan', 'profil'], $keys('manajer'));
    }

    public function test_role_masuk_ke_klaim_jwt(): void
    {
        $user = $this->makeUser('dokter');
        $token = $this->loginToken($user);

        $payload = json_decode(base64_decode(strtr(explode('.', $token)[1], '-_', '+/')), true);
        $this->assertSame('dokter', $payload['role']);
    }

    public function test_me_butuh_token(): void
    {
        $this->getJson('/api/me')->assertStatus(401)->assertJsonPath('success', false);
        $this->getJson('/api/me', ['Authorization' => 'Bearer token-ngawur'])->assertStatus(401);
    }

    public function test_me_dengan_token_valid(): void
    {
        $user = $this->makeUser('manajer');
        $token = $this->loginToken($user);

        $this->getJson('/api/me', ['Authorization' => "Bearer $token"])
            ->assertOk()
            ->assertJsonPath('user.email', 'user@florion.com')
            ->assertJsonPath('user.role', 'manajer');
    }

    public function test_logout_membuat_token_tidak_berlaku_lagi(): void
    {
        $user = $this->makeUser();
        $token = $this->loginToken($user);
        $header = ['Authorization' => "Bearer $token"];

        $this->postJson('/api/logout', [], $header)->assertOk();
        $this->getJson('/api/me', $header)->assertStatus(401);
    }

    public function test_refresh_menghasilkan_token_baru(): void
    {
        $user = $this->makeUser();
        $token = $this->loginToken($user);

        $baru = $this->postJson('/api/refresh', [], ['Authorization' => "Bearer $token"])
            ->assertOk()
            ->json('access_token');

        $this->assertNotSame($token, $baru);
        $this->getJson('/api/me', ['Authorization' => "Bearer $baru"])->assertOk();
    }

    public function test_middleware_role_membatasi_akses(): void
    {
        Route::middleware(['api', 'auth:api', 'role:admin,paramedik'])
            ->get('/api/_uji-role', fn() => response()->json(['ok' => true]));

        $admin = $this->loginToken($this->makeUser('admin', true, 'admin@florion.com'));
        $dokter = $this->loginToken($this->makeUser('dokter', true, 'dokter@florion.com'));

        $this->resetAuthState();
        $this->getJson('/api/_uji-role', ['Authorization' => "Bearer $admin"])->assertOk();

        $this->resetAuthState();
        $this->getJson('/api/_uji-role', ['Authorization' => "Bearer $dokter"])
            ->assertStatus(403)
            ->assertJsonPath('message', 'Anda tidak memiliki hak akses untuk fitur ini.');

        $this->resetAuthState();
        $this->getJson('/api/_uji-role')->assertStatus(401);
    }

    public function test_login_dibatasi_setelah_5_percobaan_gagal(): void
    {
        $this->makeUser();

        for ($i = 0; $i < 5; $i++) {
            $this->postJson('/api/login', ['email' => 'user@florion.com', 'password' => 'salah'])->assertStatus(401);
        }

        $this->postJson('/api/login', ['email' => 'user@florion.com', 'password' => 'salah'])->assertStatus(429);
    }

    public function test_seeder_membuat_empat_role(): void
    {
        $this->seed();

        foreach (['admin', 'paramedik', 'dokter', 'manajer'] as $role) {
            $this->assertDatabaseHas('users', ['role' => $role]);
        }

        $this->seed();
        $this->assertSame(4, User::count());
    }
}
