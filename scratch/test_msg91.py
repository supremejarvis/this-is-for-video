import urllib.request, urllib.parse, json

authkeys = ['561266ADmXXclWZ6a81f661P1', '561266TAI7tBdjX5u6a897391P1']
template_ids = ['6a986d4effc61fd8910a4952', '6a86ed3094923afc200a1f92']
mobile = '918511626267'

for ak in authkeys:
    for tid in template_ids:
        url = f'https://control.msg91.com/api/v5/otp?template_id={tid}&mobile={mobile}&authkey={ak}&otp_expiry=10&otp_length=4'
        req = urllib.request.Request(url, headers={'authkey': ak, 'Content-Type': 'application/json'}, method='POST')
        try:
            with urllib.request.urlopen(req) as resp:
                print(f"Key: {ak[:8]}.. Tid: {tid[:8]}.. -> Status: {resp.status} Body: {resp.read().decode('utf-8')}")
        except urllib.error.HTTPError as e:
            print(f"Key: {ak[:8]}.. Tid: {tid[:8]}.. -> HTTPError {e.code}: {e.read().decode('utf-8')}")
        except Exception as e:
            print(f"Key: {ak[:8]}.. Tid: {tid[:8]}.. -> Error: {e}")
