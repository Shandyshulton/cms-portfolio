@component('mail::message')
# Hello {{ $recipientName }},

{{ $replyMessage }}

---

**Original message:**

> **Subject:** {{ $subject }}
> {{ $originalMessage }}

@component('mail::button', ['url' => config('app.url')])
Visit My Portfolio
@endcomponent

Thanks,<br>
{{ config('app.name') }}
@endcomponent
