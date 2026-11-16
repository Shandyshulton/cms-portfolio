@component('mail::message')
# Login Code

Use the code below to sign in to the Portfolio CMS:

@component('mail::panel')
# {{ $code }}
@endcomponent

This code expires in **{{ $expiresInMinutes }} minute{{ $expiresInMinutes == 1 ? '' : 's' }}**. If you did not request it, ignore this email and never share the code with anyone.

Thanks,<br>
{{ config('mail.from.name') }}
@endcomponent
