<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Experience;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ExperienceController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        return response()->json(Experience::query()->orderBy('sort_order')->latest('id')->paginate($request->integer('per_page', 20)));
    }

    public function store(Request $request): JsonResponse
    {
        $experience = Experience::create($this->validated($request));
        return response()->json(['message' => 'Experience created successfully.', 'experience' => $experience], 201);
    }

    public function show(Experience $experience): JsonResponse
    {
        return response()->json(['experience' => $experience]);
    }

    public function update(Request $request, Experience $experience): JsonResponse
    {
        $experience->update($this->validated($request));
        return response()->json(['message' => 'Experience updated successfully.', 'experience' => $experience->refresh()]);
    }

    public function destroy(Experience $experience): JsonResponse
    {
        $experience->delete();
        return response()->json(['message' => 'Experience deleted successfully.']);
    }

    private function validated(Request $request): array
    {
        return $request->validate([
            'company_name' => ['required', 'string', 'max:180'],
            'role' => ['required', 'string', 'max:180'],
            'work_model' => ['nullable', 'string', 'max:80'],
            'location' => ['nullable', 'string', 'max:160'],
            'start_date' => ['nullable', 'date'],
            'end_date' => ['nullable', 'date'],
            'is_current' => ['boolean'],
            'status' => ['required', Rule::in(['draft', 'published'])],
            'skills' => ['nullable', 'array'],
            'translations' => ['nullable', 'array'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
        ]);
    }
}
