<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use App\Support\PayloadCrypto;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SettingController extends Controller
{
    public function index(): JsonResponse
    {
        $settings = Setting::query()->get()->groupBy('group')->map(fn ($items) => $items->pluck('value', 'key'));

        return response()->json(['settings' => PayloadCrypto::encryptSettings($settings->toArray())]);
    }

    public function update(Request $request): JsonResponse
    {
        $payload = $request->validate(['settings' => ['required', 'array']]);

        // Decrypt any encrypted PII fields the frontend sends back.
        $settings = PayloadCrypto::decryptSettings($payload['settings']);

        foreach ($settings as $group => $items) {
            foreach ($items as $key => $value) {
                Setting::updateOrCreate(['group' => $group, 'key' => $key], ['value' => $value]);
            }
        }

        return response()->json(['message' => 'Settings updated successfully.']);
    }
}
