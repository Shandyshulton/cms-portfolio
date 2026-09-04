@component('mail::message')
# Hello Mr/Mrs {{ $recipientName }},

{{ $replyMessage }}

---

**Original message:**

> **Subject:** {{ $subject }}
>
> {{ $originalMessage }}

@component('mail::button', ['url' => 'https://www.shandyshultonshihab.my.id'])
Visit My Portfolio
@endcomponent

Thanks,<br>
{{ config('mail.from.name') }}
@endcomponent
