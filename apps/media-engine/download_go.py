import urllib.request
import ssl

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

url = "https://go.dev/dl/go1.23.0.linux-amd64.tar.gz"
print("Downloading...")
try:
    urllib.request.urlretrieve(url, "go1.23.0.linux-amd64.tar.gz")
    print("Download complete")
except Exception as e:
    print(f"Error: {e}")
