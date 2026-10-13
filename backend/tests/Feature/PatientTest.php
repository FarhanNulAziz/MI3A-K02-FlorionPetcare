<?php

namespace Tests\Feature;

use App\Models\Owner;
use App\Models\Patient;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class PatientTest extends TestCase
{
    use RefreshDatabase;

    private function makeAdmin(): string
    {
        User::create([
            'name' => 'Admin Uji',
            'email' => 'admin-pasien@florion.com',
            'password' => Hash::make('password123'),
            'role' => 'admin',
            'is_active' => true,
        ]);

        return $this->postJson('/api/login', [
            'email' => 'admin-pasien@florion.com',
            'password' => 'password123',
        ])->assertOk()->json('access_token');
    }

    private function makeOwner(): Owner
    {
        return Owner::create([
            'name' => 'Budi Santoso',
            'address' => 'Jl. Melati No. 10',
            'phone' => '081234567890',
            'email' => 'budi@example.com',
        ]);
    }

    private function patientData(int $ownerId): array
    {
        return [
            'name' => 'Milo',
            'species' => 'Kucing',
            'breed' => 'Persia',
            'age' => 2,
            'weight' => 4.50,
            'owner_id' => $ownerId,
            'notes' => 'Vaksin pertama',
        ];
    }

    public function test_admin_dapat_melihat_daftar_pasien(): void
    {
        $token = $this->makeAdmin();
        $owner = $this->makeOwner();

        Patient::create($this->patientData($owner->id));

        $this->getJson('/api/patients', [
            'Authorization' => "Bearer $token",
        ])
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.0.name', 'Milo')
            ->assertJsonPath('data.0.owner.name', 'Budi Santoso');
    }

    public function test_admin_dapat_menambahkan_pasien(): void
    {
        $token = $this->makeAdmin();
        $owner = $this->makeOwner();

        $this->postJson('/api/patients', $this->patientData($owner->id), [
            'Authorization' => "Bearer $token",
        ])
            ->assertCreated()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.name', 'Milo')
            ->assertJsonPath('data.owner_id', $owner->id);

        $this->assertDatabaseHas('patients', [
            'name' => 'Milo',
            'owner_id' => $owner->id,
        ]);
    }

    public function test_admin_dapat_melihat_detail_pasien(): void
    {
        $token = $this->makeAdmin();
        $owner = $this->makeOwner();
        $patient = Patient::create($this->patientData($owner->id));

        $this->getJson("/api/patients/{$patient->id}", [
            'Authorization' => "Bearer $token",
        ])
            ->assertOk()
            ->assertJsonPath('data.id', $patient->id)
            ->assertJsonPath('data.name', 'Milo');
    }

    public function test_admin_dapat_memperbarui_pasien(): void
    {
        $token = $this->makeAdmin();
        $owner = $this->makeOwner();
        $patient = Patient::create($this->patientData($owner->id));

        $data = $this->patientData($owner->id);
        $data['age'] = 3;
        $data['weight'] = 4.8;
        $data['notes'] = 'Pemeriksaan rutin';

        $this->putJson("/api/patients/{$patient->id}", $data, [
            'Authorization' => "Bearer $token",
        ])
            ->assertOk()
            ->assertJsonPath('data.age', 3)
            ->assertJsonPath('data.notes', 'Pemeriksaan rutin');

        $this->assertDatabaseHas('patients', [
            'id' => $patient->id,
            'age' => 3,
        ]);
    }

    public function test_admin_dapat_menghapus_pasien(): void
    {
        $token = $this->makeAdmin();
        $owner = $this->makeOwner();
        $patient = Patient::create($this->patientData($owner->id));

        $this->deleteJson("/api/patients/{$patient->id}", [], [
            'Authorization' => "Bearer $token",
        ])
            ->assertOk()
            ->assertJsonPath('success', true);

        $this->assertDatabaseMissing('patients', [
            'id' => $patient->id,
        ]);
    }

    public function test_pasien_tidak_dapat_disimpan_tanpa_pemilik(): void
    {
        $token = $this->makeAdmin();
        $data = $this->patientData(1);
        unset($data['owner_id']);

        $this->postJson('/api/patients', $data, [
            'Authorization' => "Bearer $token",
        ])
            ->assertStatus(422)
            ->assertJsonPath('errors.owner_id.0', 'Pemilik wajib dipilih.');
    }

    public function test_pasien_menolak_umur_nol(): void
    {
        $token = $this->makeAdmin();
        $owner = $this->makeOwner();
        $data = $this->patientData($owner->id);
        $data['age'] = 0;

        $this->postJson('/api/patients', $data, [
            'Authorization' => "Bearer $token",
        ])
            ->assertStatus(422)
            ->assertJsonPath('errors.age.0', 'Umur hewan harus lebih dari 0.');
    }

    public function test_pasien_menolak_berat_nol(): void
    {
        $token = $this->makeAdmin();
        $owner = $this->makeOwner();
        $data = $this->patientData($owner->id);
        $data['weight'] = 0;

        $this->postJson('/api/patients', $data, [
            'Authorization' => "Bearer $token",
        ])
            ->assertStatus(422)
            ->assertJsonPath('errors.weight.0', 'Berat hewan harus lebih dari 0 kg.');
    }
}
