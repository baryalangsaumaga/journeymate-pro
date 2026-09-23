<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        User::updateOrCreate(
            ['email' => 'admin@intellitravel.com'],
            [
                'username' => 'admin',
                'password' => \Illuminate\Support\Facades\Hash::make('admin123456'),
                'is_admin' => true,
                'profile_pic' => 'https://ui-avatars.com/api/?name=Admin&background=ef4444&color=fff',
            ]
        );

        User::updateOrCreate(
            ['email' => 'test@example.com'],
            [
                'username' => 'Test User',
                'password' => \Illuminate\Support\Facades\Hash::make('password'),
                'is_admin' => false,
            ]
        );
    }
}
