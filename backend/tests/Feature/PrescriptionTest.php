<?php

namespace Tests\Feature;

use App\Models\MedicalRecord;
use App\Models\Medicine;
use App\Models\Owner;
use App\Models\Patient;
use App\Models\Treatment;
use App\Models\User;
use Database\Seeders\TreatmentSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class PrescriptionTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        // Master tindakan dipakai banyak test, jadi disiapkan sekali per test.
        $this->seed(TreatmentSeeder::class);
    }

    private function makeUser(string $role, string $email): User
    {
        return User::create([
            'name' => 'User ' . $role,
            'email' => $email,
            'password' => Hash::make('password123'),
            'role' => $role,
            'is_active' => true,
        ]);
    }

    private function tokenFor(string $role, string $email): string
    {
        $this->makeUser($role, $email);

        return $this->postJson('/api/login', [
            'email' => $email,
            'password' => 'password123',
        ])->assertOk()->json('access_token');
    }

    /**
     * Guard JWT di test perlu di-reset saat berganti user/token.
     */
    private function resetAuthState(): void
    {
        $this->app->forgetInstance('tymon.jwt');
        $this->app->forgetInstance('tymon.jwt.auth');
        $this->app['auth']->forgetGuards();
    }

    private function headers(string $token): array
    {
        return ['Authorization' => "Bearer $token"];
    }

    private function makeRecord(User $dokter): MedicalRecord
    {
        $owner = Owner::create([
            'name' => 'Budi Santoso',
            'address' => 'Jl. Melati No. 10',
            'phone' => '081234567890',
            'email' => 'budi-' . $dokter->id . '@example.com',
        ]);

        $patient = Patient::create([
            'owner_id' => $owner->id,
            'name' => 'Milo',
            'species' => 'Kucing',
            'gender' => 'Jantan',
            'age' => 2,
            'weight' => 4.50,
        ]);

        return MedicalRecord::create([
            'patient_id' => $patient->id,
            'user_id' => $dokter->id,
            'subjective' => 'Lesu',
            'objective' => 'Nafsu makan turun',
            'assessment' => 'Infeksi ringan',
            'plan' => 'Obat dan tindakan pendukung',
        ]);
    }

    private function medicine(string $name, int $stock = 100, bool $active = true): Medicine
    {
        return Medicine::create([
            'name' => $name,
            'unit' => 'tablet',
            'stock' => $stock,
            'is_active' => $active,
        ]);
    }

    private function treatment(string $name): Treatment
    {
        $treatment = Treatment::where('name', $name)->first();

        if (! $treatment) {
            $this->fail("Master tindakan {$name} tidak ditemukan.");
        }

        return $treatment;
    }

    private function itemPayload(Medicine $medicine, array $overrides = []): array
    {
        return array_merge([
            'medicine_id' => $medicine->id,
            'quantity' => 5,
            'dosage' => '1 tablet',
            'frequency' => '3x sehari',
            'duration_days' => 5,
            'must_finish' => true,
            'instructions' => 'Setelah makan',
        ], $overrides);
    }

    private function treatmentPayload(string $name, array $overrides = []): array
    {
        return array_merge([
            'treatment_id' => $this->treatment($name)->id,
        ], $overrides);
    }

    private function storeUrl(MedicalRecord $record): string
    {
        return "/api/medical-records/{$record->id}/prescriptions";
    }

    private function store(MedicalRecord $record, array $payload, string $token)
    {
        return $this->postJson($this->storeUrl($record), $payload, $this->headers($token));
    }

    /**
     * Error validasi Laravel memakai key dotted, jadi dibaca langsung dari array.
     */
    private function assertError($response, string $key, string $message): void
    {
        $errors = $response->json('errors', []);

        $this->assertSame($message, $errors[$key][0] ?? null);
    }

    public function test_dokter_dapat_menyimpan_resep_dan_tindakan_lalu_membacanya(): void
    {
        $dokter = $this->makeUser('dokter', 'dokter-simpan@florion.test');
        $token = $this->tokenFor('dokter', 'dokter-simpan-2@florion.test');
        $record = $this->makeRecord($dokter);

        $obatA = $this->medicine('Obat A', 100);
        $obatB = $this->medicine('Obat B', 80);

        $response = $this->store($record, [
            'items' => [
                $this->itemPayload($obatA, ['quantity' => 3]),
                $this->itemPayload($obatB, ['quantity' => 2, 'dosage' => '5 ml']),
            ],
            'treatments' => [
                $this->treatmentPayload('Steril Jantan', [
                    'consent_given' => true,
                    'consent_by' => 'Budi Santoso',
                ]),
                $this->treatmentPayload('Cek Jamur'),
            ],
        ], $token);

        $response->assertCreated()
            ->assertJsonPath('success', true)
            ->assertJsonPath('message', 'Resep dan tindakan berhasil disimpan.')
            ->assertJsonPath('data.prescriptions.0.medicine.name', 'Obat A')
            ->assertJsonPath('data.treatments.0.treatment.name', 'Steril Jantan')
            ->assertJsonPath('data.treatments.1.price', '35000.00');

        $this->assertDatabaseCount('prescriptions', 2);
        $this->assertDatabaseCount('medical_record_treatments', 2);
        $this->assertSame(97, $obatA->fresh()->stock);
        $this->assertSame(78, $obatB->fresh()->stock);

        $this->getJson($this->storeUrl($record), $this->headers($token))
            ->assertOk()
            ->assertJsonPath('data.prescriptions.0.medicine.name', 'Obat A')
            ->assertJsonPath('data.treatments.0.treatment.name', 'Steril Jantan')
            ->assertJsonCount(2, 'data.prescriptions')
            ->assertJsonCount(2, 'data.treatments');
    }

    public function test_stok_berkurang_dan_kembali_saat_item_resep_dihapus(): void
    {
        $dokter = $this->makeUser('dokter', 'dokter-stok@florion.test');
        $token = $this->tokenFor('dokter', 'dokter-stok-2@florion.test');
        $record = $this->makeRecord($dokter);
        $obat = $this->medicine('Obat Stok', 100);

        $response = $this->store($record, [
            'items' => [$this->itemPayload($obat, ['quantity' => 7])],
        ], $token)->assertCreated();

        $this->assertSame(93, $obat->fresh()->stock);

        $prescriptionId = $response->json('data.prescriptions.0.id');
        $this->deleteJson("/api/prescriptions/{$prescriptionId}", [], $this->headers($token))
            ->assertOk()
            ->assertJsonPath('success', true);

        $this->assertDatabaseMissing('prescriptions', ['id' => $prescriptionId]);
        $this->assertSame(100, $obat->fresh()->stock);
    }

    public function test_stok_kurang_mengembalikan_422_dan_membatalkan_semua(): void
    {
        $dokter = $this->makeUser('dokter', 'dokter-gagal@florion.test');
        $token = $this->tokenFor('dokter', 'dokter-gagal-2@florion.test');
        $record = $this->makeRecord($dokter);

        $obatA = $this->medicine('Obat Kurang', 2);
        $obatB = $this->medicine('Obat Cukup', 100);

        $this->store($record, [
            'items' => [
                $this->itemPayload($obatA, ['quantity' => 5]),
                $this->itemPayload($obatB, ['quantity' => 3]),
            ],
            'treatments' => [$this->treatmentPayload('Cek Jamur')],
        ], $token)
            ->assertStatus(422)
            ->assertJsonPath('errors.items.0', 'Stok obat Obat Kurang tidak cukup (tersisa 2).');

        $this->assertDatabaseCount('prescriptions', 0);
        $this->assertDatabaseCount('medical_record_treatments', 0);
        $this->assertSame(2, $obatA->fresh()->stock);
        $this->assertSame(100, $obatB->fresh()->stock);
    }

    public function test_obat_sama_dua_kali_dijumlahkan_saat_cek_stok(): void
    {
        $dokter = $this->makeUser('dokter', 'dokter-double@florion.test');
        $token = $this->tokenFor('dokter', 'dokter-double-2@florion.test');
        $record = $this->makeRecord($dokter);
        $obat = $this->medicine('Obat Double', 12);

        $this->store($record, [
            'items' => [
                $this->itemPayload($obat, ['quantity' => 10]),
                $this->itemPayload($obat, ['quantity' => 10, 'dosage' => '2 tablet']),
            ],
        ], $token)
            ->assertStatus(422)
            ->assertJsonPath('errors.items.0', 'Stok obat Obat Double tidak cukup (tersisa 12).');

        $this->assertDatabaseCount('prescriptions', 0);
        $this->assertSame(12, $obat->fresh()->stock);

        $obat->update(['stock' => 25]);
        $this->store($record, [
            'items' => [
                $this->itemPayload($obat, ['quantity' => 10]),
                $this->itemPayload($obat, ['quantity' => 10]),
            ],
        ], $token)->assertCreated();

        $this->assertDatabaseCount('prescriptions', 2);
        $this->assertSame(5, $obat->fresh()->stock);
    }

    public function test_must_finish_tersimpan_dan_terbaca_benar(): void
    {
        $dokter = $this->makeUser('dokter', 'dokter-finish@florion.test');
        $token = $this->tokenFor('dokter', 'dokter-finish-2@florion.test');
        $record = $this->makeRecord($dokter);
        $obat = $this->medicine('Obat Finish', 100);

        $this->store($record, [
            'items' => [
                $this->itemPayload($obat, ['must_finish' => true]),
                $this->itemPayload($obat, ['must_finish' => false, 'dosage' => '1/2 tablet']),
            ],
        ], $token)
            ->assertCreated()
            ->assertJsonPath('data.prescriptions.0.must_finish', true)
            ->assertJsonPath('data.prescriptions.1.must_finish', false);

        $this->getJson($this->storeUrl($record), $this->headers($token))
            ->assertOk()
            ->assertJsonPath('data.prescriptions.0.must_finish', true)
            ->assertJsonPath('data.prescriptions.1.must_finish', false);
    }

    public function test_tarif_tetap_steril_diisi_otomatis_tanpa_price(): void
    {
        $dokter = $this->makeUser('dokter', 'dokter-steril@florion.test');
        $token = $this->tokenFor('dokter', 'dokter-steril-2@florion.test');
        $record = $this->makeRecord($dokter);

        $this->store($record, [
            'treatments' => [
                $this->treatmentPayload('Steril Jantan', ['consent_given' => true, 'consent_by' => 'Budi']),
                $this->treatmentPayload('Steril Betina', ['consent_given' => true, 'consent_by' => 'Budi']),
            ],
        ], $token)
            ->assertCreated()
            ->assertJsonPath('data.treatments.0.price', '350000.00')
            ->assertJsonPath('data.treatments.1.price', '550000.00');

        $this->assertDatabaseHas('medical_record_treatments', [
            'treatment_id' => $this->treatment('Steril Jantan')->id,
            'price' => 350000,
        ]);
        $this->assertDatabaseHas('medical_record_treatments', [
            'treatment_id' => $this->treatment('Steril Betina')->id,
            'price' => 550000,
        ]);
    }

    public function test_tarif_rentang_caesar_dan_cek_darah(): void
    {
        $dokter = $this->makeUser('dokter', 'dokter-rentang@florion.test');
        $token = $this->tokenFor('dokter', 'dokter-rentang-2@florion.test');
        $record = $this->makeRecord($dokter);

        $response = $this->store($record, [
            'treatments' => [$this->treatmentPayload('Caesar', ['price' => 500000, 'consent_given' => true, 'consent_by' => 'Budi'])],
        ], $token)->assertStatus(422);
        $this->assertError($response, 'treatments.0.price', 'Tarif Caesar harus antara Rp 600.000 dan Rp 800.000.');

        $this->store($record, [
            'treatments' => [$this->treatmentPayload('Caesar', ['price' => 900000, 'consent_given' => true, 'consent_by' => 'Budi'])],
        ], $token)->assertStatus(422);

        $response = $this->store($record, [
            'treatments' => [$this->treatmentPayload('Caesar', ['consent_given' => true, 'consent_by' => 'Budi'])],
        ], $token)->assertStatus(422);
        $this->assertError($response, 'treatments.0.price', 'Tarif Caesar wajib diisi.');

        $this->store($record, [
            'treatments' => [$this->treatmentPayload('Cek Darah', ['price' => 200000])],
        ], $token)->assertStatus(422);

        $this->store($record, [
            'treatments' => [$this->treatmentPayload('Caesar', ['price' => 700000, 'consent_given' => true, 'consent_by' => 'Budi'])],
        ], $token)
            ->assertCreated()
            ->assertJsonPath('data.treatments.0.price', '700000.00');

        $this->store($record, [
            'treatments' => [$this->treatmentPayload('Cek Darah', ['price' => 300000])],
        ], $token)
            ->assertCreated()
            ->assertJsonPath('data.treatments.1.price', '300000.00');
    }

    public function test_tindakan_lainnya_membutuhkan_custom_name_dan_price(): void
    {
        $dokter = $this->makeUser('dokter', 'dokter-lain@florion.test');
        $token = $this->tokenFor('dokter', 'dokter-lain-2@florion.test');
        $record = $this->makeRecord($dokter);

        $response = $this->store($record, [
            'treatments' => [$this->treatmentPayload('Tindakan Lainnya', ['price' => 75000])],
        ], $token)->assertStatus(422);
        $this->assertError($response, 'treatments.0.custom_name', 'Nama tindakan wajib diisi untuk Tindakan Lainnya.');

        $response = $this->store($record, [
            'treatments' => [$this->treatmentPayload('Tindakan Lainnya', ['custom_name' => 'Perawatan luka'])],
        ], $token)->assertStatus(422);
        $this->assertError($response, 'treatments.0.price', 'Tarif tindakan wajib diisi.');

        $this->store($record, [
            'treatments' => [$this->treatmentPayload('Tindakan Lainnya', [
                'custom_name' => 'Perawatan luka',
                'price' => 75000,
            ])],
        ], $token)
            ->assertCreated()
            ->assertJsonPath('data.treatments.0.custom_name', 'Perawatan luka')
            ->assertJsonPath('data.treatments.0.price', '75000.00');

        $this->store($record, [
            'treatments' => [$this->treatmentPayload('Tindakan Lainnya', [
                'custom_name' => 'Pemasangan infus',
                'price' => 95000,
            ])],
        ], $token)
            ->assertCreated()
            ->assertJsonPath('data.treatments.1.custom_name', 'Pemasangan infus');

        $this->assertDatabaseCount('medical_record_treatments', 2);
    }

    public function test_tindakan_master_non_relatif_tidak_boleh_duplikat(): void
    {
        $dokter = $this->makeUser('dokter', 'dokter-duplikat@florion.test');
        $token = $this->tokenFor('dokter', 'dokter-duplikat-2@florion.test');
        $record = $this->makeRecord($dokter);

        $this->store($record, [
            'treatments' => [$this->treatmentPayload('Cek Jamur')],
        ], $token)->assertCreated();

        $this->store($record, [
            'treatments' => [$this->treatmentPayload('Cek Jamur')],
        ], $token)
            ->assertStatus(422)
            ->assertJsonPath('errors.treatments.0', 'Tindakan Cek Jamur sudah pernah dicatat pada rekam medis ini.');

        $recordBaru = $this->makeRecord($dokter);
        $this->store($recordBaru, [
            'treatments' => [
                $this->treatmentPayload('Cek Tungau'),
                $this->treatmentPayload('Cek Tungau'),
            ],
        ], $token)->assertStatus(422);

        $this->assertDatabaseCount('medical_record_treatments', 1);
    }

    public function test_consent_wajib_untuk_tindakan_berisiko(): void
    {
        $dokter = $this->makeUser('dokter', 'dokter-consent@florion.test');
        $token = $this->tokenFor('dokter', 'dokter-consent-2@florion.test');

        foreach (['Steril Jantan', 'Steril Betina', 'Caesar', 'Cateter'] as $nama) {
            $record = $this->makeRecord($dokter);
            $overrides = in_array($nama, ['Caesar'], true) ? ['price' => 700000] : [];

            $response = $this->store($record, [
                'treatments' => [$this->treatmentPayload($nama, $overrides)],
            ], $token)->assertStatus(422);
            $this->assertError($response, 'treatments.0.consent_given', "Tindakan {$nama} memerlukan persetujuan pemilik hewan.");

            $response = $this->store($record, [
                'treatments' => [$this->treatmentPayload($nama, $overrides + [
                    'consent_given' => true,
                ])],
            ], $token)->assertStatus(422);
            $this->assertError($response, 'treatments.0.consent_by', 'Nama pemilik/wali wajib diisi saat memberikan persetujuan.');
        }

        $record = $this->makeRecord($dokter);
        $response = $this->store($record, [
            'treatments' => [$this->treatmentPayload('Cateter', [
                'consent_given' => true,
                'consent_by' => 'Budi Santoso',
                'consent_at' => '1999-01-01 00:00:00',
            ])],
        ], $token)->assertCreated();

        $consentAt = $response->json('data.treatments.0.consent_at');
        $this->assertNotNull($consentAt);
        $this->assertStringStartsWith(now()->format('Y'), $consentAt);
        $this->assertStringNotContainsString('1999', $consentAt);
        $this->assertDatabaseHas('medical_record_treatments', [
            'consent_given' => true,
            'consent_by' => 'Budi Santoso',
        ]);
    }

    public function test_tindakan_tanpa_consent_diperbolehkan(): void
    {
        $dokter = $this->makeUser('dokter', 'dokter-noconsent@florion.test');
        $token = $this->tokenFor('dokter', 'dokter-noconsent-2@florion.test');
        $record = $this->makeRecord($dokter);

        $this->store($record, [
            'treatments' => [
                $this->treatmentPayload('Cek Jamur'),
                $this->treatmentPayload('Cek Tungau'),
                $this->treatmentPayload('Cek Darah', ['price' => 300000]),
            ],
        ], $token)
            ->assertCreated()
            ->assertJsonPath('data.treatments.0.consent_given', false)
            ->assertJsonPath('data.treatments.1.consent_given', false)
            ->assertJsonPath('data.treatments.2.consent_given', false);

        $this->assertDatabaseCount('medical_record_treatments', 3);
    }

    public function test_obat_nonaktif_dan_tidak_ada_ditolak(): void
    {
        $dokter = $this->makeUser('dokter', 'dokter-obat@florion.test');
        $token = $this->tokenFor('dokter', 'dokter-obat-2@florion.test');
        $record = $this->makeRecord($dokter);

        $nonaktif = $this->medicine('Obat Nonaktif', 100, false);
        $this->store($record, [
            'items' => [$this->itemPayload($nonaktif)],
        ], $token)
            ->assertStatus(422)
            ->assertJsonPath('errors.items.0', 'Obat Obat Nonaktif tidak aktif.');

        $response = $this->store($record, [
            'items' => [$this->itemPayload($nonaktif, ['medicine_id' => 999999])],
        ], $token)->assertStatus(422);
        $this->assertError($response, 'items.0.medicine_id', 'Obat tidak ditemukan.');

        $this->assertDatabaseCount('prescriptions', 0);
        $this->assertSame(100, $nonaktif->fresh()->stock);
    }

    public function test_hak_akses_per_role(): void
    {
        $dokter = $this->makeUser('dokter', 'akses-dokter@florion.test');
        $record = $this->makeRecord($dokter);
        $obat = $this->medicine('Obat Akses', 100);
        $payload = ['items' => [$this->itemPayload($obat)]];

        $this->getJson($this->storeUrl($record))->assertStatus(401);
        $this->postJson($this->storeUrl($record), $payload)->assertStatus(401);

        $paramedikToken = $this->tokenFor('paramedik', 'akses-paramedik@florion.test');
        $this->resetAuthState();
        $this->getJson($this->storeUrl($record), $this->headers($paramedikToken))->assertOk();
        $this->resetAuthState();
        $this->postJson($this->storeUrl($record), $payload, $this->headers($paramedikToken))->assertStatus(403);

        foreach (['pemilik' => 'akses-pemilik@florion.test', 'manajer' => 'akses-manajer@florion.test'] as $role => $email) {
            $token = $this->tokenFor($role, $email);
            $this->resetAuthState();
            $this->getJson($this->storeUrl($record), $this->headers($token))->assertStatus(403);
            $this->resetAuthState();
            $this->postJson($this->storeUrl($record), $payload, $this->headers($token))->assertStatus(403);
        }

        $this->assertDatabaseCount('prescriptions', 0);
    }

    public function test_dropdown_master_hanya_menampilkan_data_aktif(): void
    {
        $this->makeUser('dokter', 'dokter-dropdown@florion.test');
        $token = $this->tokenFor('dokter', 'dokter-dropdown-2@florion.test');

        $aktif = $this->medicine('Obat Aktif Dropdown', 77);
        $this->medicine('Obat Nonaktif Dropdown', 50, false);
        Treatment::create([
            'name' => 'Tindakan Nonaktif',
            'price_min' => 10000,
            'price_max' => 10000,
            'is_active' => false,
        ]);

        $obat = $this->getJson('/api/medicines', $this->headers($token))
            ->assertOk()
            ->assertJsonPath('success', true)
            ->json('data');
        $this->assertContains('Obat Aktif Dropdown', collect($obat)->pluck('name')->all());
        $this->assertNotContains('Obat Nonaktif Dropdown', collect($obat)->pluck('name')->all());
        $this->assertSame(77, collect($obat)->firstWhere('id', $aktif->id)['stock']);

        $this->getJson('/api/medicines?search=' . urlencode('Obat Aktif'), $this->headers($token))
            ->assertOk()
            ->assertJsonCount(1, 'data');

        $tindakan = $this->getJson('/api/treatments', $this->headers($token))
            ->assertOk()
            ->json('data');
        $this->assertContains('Steril Jantan', collect($tindakan)->pluck('name')->all());
        $this->assertNotContains('Tindakan Nonaktif', collect($tindakan)->pluck('name')->all());
        $this->assertArrayHasKey('price_min', $tindakan[0]);
        $this->assertArrayHasKey('price_max', $tindakan[0]);
        $this->assertArrayHasKey('is_relative', $tindakan[0]);
        $this->assertArrayHasKey('requires_consent', $tindakan[0]);
    }

    public function test_admin_dan_manajer_dapat_mengelola_master_obat(): void
    {
        $adminToken = $this->tokenFor('admin', 'master-admin@florion.test');
        $this->postJson('/api/medicines', [
            'name' => 'Obat Baru',
            'unit' => 'ml',
            'stock' => 50,
        ], $this->headers($adminToken))
            ->assertCreated()
            ->assertJsonPath('data.stock', 50);

        $obat = Medicine::where('name', 'Obat Baru')->firstOrFail();
        $this->postJson('/api/medicines', [
            'name' => 'Obat Baru',
            'unit' => 'ml',
            'stock' => 10,
        ], $this->headers($adminToken))
            ->assertStatus(422)
            ->assertJsonPath('errors.name.0', 'Nama obat sudah ada.');

        $manajerToken = $this->tokenFor('manajer', 'master-manajer@florion.test');
        $this->resetAuthState();
        $this->getJson('/api/medicines', $this->headers($manajerToken))->assertStatus(403);

        $this->resetAuthState();
        $this->putJson("/api/medicines/{$obat->id}", ['stock' => 150], $this->headers($manajerToken))
            ->assertOk()
            ->assertJsonPath('data.stock', 150);

        $this->resetAuthState();
        $this->deleteJson("/api/medicines/{$obat->id}", [], $this->headers($manajerToken))
            ->assertOk();

        $this->assertDatabaseMissing('medicines', ['id' => $obat->id]);
    }

    public function test_put_resep_menyesuaikan_stok(): void
    {
        $dokter = $this->makeUser('dokter', 'dokter-put@florion.test');
        $token = $this->tokenFor('dokter', 'dokter-put-2@florion.test');
        $record = $this->makeRecord($dokter);

        $obatA = $this->medicine('Obat Put A', 100);
        $obatB = $this->medicine('Obat Put B', 100);

        $response = $this->store($record, [
            'items' => [$this->itemPayload($obatA, ['quantity' => 10])],
        ], $token)->assertCreated();

        $id = $response->json('data.prescriptions.0.id');

        $this->putJson("/api/prescriptions/{$id}", $this->itemPayload($obatA, ['quantity' => 4]), $this->headers($token))
            ->assertOk()
            ->assertJsonPath('data.quantity', 4);
        $this->assertSame(96, $obatA->fresh()->stock);

        $this->putJson("/api/prescriptions/{$id}", $this->itemPayload($obatB, ['quantity' => 6]), $this->headers($token))
            ->assertOk();
        $this->assertSame(100, $obatA->fresh()->stock);
        $this->assertSame(94, $obatB->fresh()->stock);
    }

    public function test_put_resep_menolak_stok_kurang(): void
    {
        $dokter = $this->makeUser('dokter', 'dokter-putgagal@florion.test');
        $token = $this->tokenFor('dokter', 'dokter-putgagal-2@florion.test');
        $record = $this->makeRecord($dokter);

        $obatA = $this->medicine('Obat Put Gagal A', 100);
        $obatB = $this->medicine('Obat Put Gagal B', 2);

        $response = $this->store($record, [
            'items' => [$this->itemPayload($obatA, ['quantity' => 10])],
        ], $token)->assertCreated();

        $id = $response->json('data.prescriptions.0.id');

        $this->putJson("/api/prescriptions/{$id}", $this->itemPayload($obatB, ['quantity' => 5]), $this->headers($token))
            ->assertStatus(422)
            ->assertJsonPath('errors.quantity.0', 'Stok obat Obat Put Gagal B tidak cukup (tersisa 2).');

        $this->assertSame(90, $obatA->fresh()->stock);
        $this->assertSame(2, $obatB->fresh()->stock);
        $this->assertDatabaseHas('prescriptions', ['id' => $id, 'medicine_id' => $obatA->id, 'quantity' => 10]);
    }

    public function test_hapus_tindakan_pivot(): void
    {
        $dokter = $this->makeUser('dokter', 'dokter-hapus-tindakan@florion.test');
        $token = $this->tokenFor('dokter', 'dokter-hapus-tindakan-2@florion.test');
        $record = $this->makeRecord($dokter);

        $response = $this->store($record, [
            'treatments' => [$this->treatmentPayload('Cek Jamur')],
        ], $token)->assertCreated();

        $id = $response->json('data.treatments.0.id');
        $this->deleteJson("/api/medical-record-treatments/{$id}", [], $this->headers($token))
            ->assertOk()
            ->assertJsonPath('success', true);

        $this->assertDatabaseMissing('medical_record_treatments', ['id' => $id]);
    }

    public function test_minimal_satu_item_atau_tindakan_harus_diisi(): void
    {
        $dokter = $this->makeUser('dokter', 'dokter-kosong@florion.test');
        $token = $this->tokenFor('dokter', 'dokter-kosong-2@florion.test');
        $record = $this->makeRecord($dokter);

        $this->store($record, [], $token)
            ->assertStatus(422)
            ->assertJsonPath('errors.items.0', 'Minimal satu resep atau tindakan wajib diisi.');

        $this->store($record, ['items' => [], 'treatments' => []], $token)->assertStatus(422);
        $this->assertDatabaseCount('prescriptions', 0);
        $this->assertDatabaseCount('medical_record_treatments', 0);
    }
}
