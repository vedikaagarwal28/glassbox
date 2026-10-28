import json
import os
import time
import unittest
from urllib.request import Request, urlopen


BASE_URL = os.environ.get("GLASSBOX_URL", "http://localhost")


def submit(language, code):
    request = Request(
        f"{BASE_URL}/api/submit",
        data=json.dumps({"language": language, "code": code}).encode(),
        headers={"Content-Type": "application/json"},
    )
    with urlopen(request) as response:
        job_id = json.load(response)["jobId"]
    for _ in range(24):
        time.sleep(0.5)
        with urlopen(f"{BASE_URL}/api/result/{job_id}") as response:
            result = json.load(response)
        if result["status"] != "queued":
            return result
    raise AssertionError(f"{language} job did not finish")


class CppRuntimeTests(unittest.TestCase):
    def test_hello_world(self):
        result = submit("cpp", '#include <iostream>\nint main(){std::cout<<"hello-cpp";}')
        self.assertEqual(result["status"], "completed")
        self.assertEqual(result["stdout"].strip(), "hello-cpp")

    def test_infinite_loop_times_out(self):
        result = submit("cpp", "int main(){for(;;){}}")
        self.assertEqual(result["status"], "failed")
        self.assertEqual(result["stderr"], "execution timed out")


if __name__ == "__main__":
    unittest.main()
