<div align="center">
<img src="https://github.com/chaitin/blazehttp/assets/30664688/746026da-6b2f-4f9c-86f1-1e3cb129ca22" width="120"/>
</div>
<h1 align="center">BlazeHTTP</h1>
<h4 align="center"><strong>English</strong> | <a href="https://github.com/chaitin/blazehttp/blob/master/README.md">
简体中文</a></h4>

BlazeHTTP stands as a user-friendly WAF **protection efficacy evaluation** tool.

- 📦 **Abundant Samples**: Currently, a total of **33669** samples are available, with continuous updates in progress...
- 🚀 **No Configuration Required**: Offers both a **graphical interface** and a command-line version, facilitating direct downloads of precompiled versions through Releases, or the option to clone the code and compile locally.
- 📖 **Exportable Reports**: Generates comprehensive reports on the execution results of all samples, including sample attributes, execution time, status codes, interception status, and more.

## Testing Metrics

|  Metric   | Description  | Calculation Method  |
|  ----  | ----  | ----  |
| Detection Rate  | Reflects the comprehensiveness of WAF detection capabilities, indicating "missed detections" if none are found. | Number of attack sample interceptions  |
| False Positive Rate  | Reflects interference with normal traffic, unreliable results being deemed "false positives". | Number of normal sample interceptions  |
| Accuracy  | The accuracy metric combines detection and false positive rates, preventing undue focus on either missed detections or false positives. |  |
| Detection Timing  | Reflects WAF performance, with greater time consumption indicating poorer performance. |  |

## Sample Instances

```bash
# Normal sample: testcases/00/02/5ebf56a710da27b73a9ad59219f0.white
GET /rc-virtual-list@3.5.2/lib/hooks/useHeights.js HTTP/1.1
Host: npm.staticblitz.com
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36
Accept: */*
Origin: https://stackblitz.com
Sec-Fetch-Site: cross-site
Sec-Fetch-Mode: cors
Sec-Fetch-Dest: empty
Referer: https://stackblitz.com/
Accept-Encoding: gzip, deflate
Accept-Language: zh-CN,zh;q=0.9,en-US;q=0.8,en;q=0.7

# Malicious sample: testcases/8a/36/0bbc7685860c526e33f3cbd83f9c.black
GET /vulnerabilities/sqli_blind/?id=1%27+or+%27%27%3D%27&Submit=Submit HTTP/1.1
Host: 10.10.3.128
Upgrade-Insecure-Requests: 1
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36
Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7
Referer: http://10.10.3.128/vulnerabilities/sqli_blind/?id=1%27+and+%27%27%3D%27&Submit=Submit
Accept-Encoding: gzip, deflate
Accept-Language: zh-CN,zh;q=0.9,en-US;q=0.8,en;q=0.7
Connection: close
```

## Testing Effectiveness

### [CloudFlare](https://www.cloudflare.com/) vs [ModSecurity](https://github.com/owasp-modsecurity/ModSecurity) vs [SafeLine](https://waf.chaitin.com/)

| Metric | CloudFlare, Free Version | ModSecurity, PARANOIA Level 1 | ModSecurity,  PARANOIA Level 4 | SafeLine, Free Version, Balance Mode | SafeLine, Free Version, Strict Mode |
| --- | --- | --- | --- | --- | --- |
| Total Samples | 33669 | 33669 | 33669 | 33669 | 33669 |
| Successful | 33350 | 33669 | 33669 | 33669 | 33669 |
| Errors | 319 | 0 | 0 | 0 | 0 |
| **Detection Rate (higher is better)** | 10.70% (Total Malicious Samples: 570, Correctly Intercepted: 61, Missed Detections: 509) | 69.74% (Total Malicious Samples: 575, Correctly Intercepted: 401, Missed Detections: 174) | 🏆 **94.61%** (Total Malicious Samples: 575, Correctly Intercepted: 544, Missed Detections: 31) | 71.65% (Total Malicious Samples: 575, Correctly Intercepted: 412, Missed Detections: 163) | 76.17% (Total Malicious Samples: 575, Correctly Intercepted: 438, Missed Detections: 137) |
| **False Positive Rate (lower is better)** | 0.07% (Total Normal Samples: 32780, Correctly Passed: 32757, False Positives: 23) | 17.58% (Total Normal Samples: 33094, Correctly Passed: 27275, False Positives: 5819) | 52.46% (Total Normal Samples: 33094, Correctly Passed: 15732, False Positives: 17362) | 🏆 **0.07%** (Total Normal Samples: 33094, Correctly Passed: 33071, False Positives: 23) | 0.22% (Total Normal Samples: 33094, Correctly Passed: 33021, False Positives: 73) |
| **Accuracy (higher is better)** | 98.40% (Correct Interceptions + Correct Passes) / Total Samples | 82.20% (Correct Interceptions + Correct Passes) / Total Samples | 48.34% (Correct Interceptions + Correct Passes) / Total Samples | 🏆 **99.45%** (Correct Interceptions + Correct Passes) / Total Samples | 99.38% (Correct Interceptions + Correct Passes) / Total Samples |
| Average Time | 288.96 milliseconds | 31.15 milliseconds | 28.89 milliseconds | 70.05 milliseconds | 64.34 milliseconds |

## Installation and Usage

** Docker Container**

```bash
# pull latest image from DockerHub
docker pull chaitin/blazehttp:latest
# run test
docker run --rm --net=host chaitin/blazehttp:latest /app/blazehttp -t <URL>
```

Precompiled artifacts from GitHub CI have been uploaded to Releases for direct downloads of the latest version [here](https://github.com/chaitin/blazehttp/releases).

**Command Line**

![blazehttp_cmd](https://github.com/chaitin/blazehttp/assets/30664688/7be052e9-2dfb-4f96-a6f2-eb2a0251910e)

**GUI** (MacOS & Windows)

> If encountering errors like **untrusted** or **moved to trash** on MacOS, execute the following command before relaunching:
> ``` bash
> sudo xattr -d com.apple.quarantine blazehttp_1.0.0_darwin_arm64.app
> ```

![gui](https://github.com/chaitin/blazehttp/assets/30664688/dee16f13-8fef-413e-89c8-515b91c52c7a)

## Local Compilation

The project is dependent solely on the Go programming language; hence, Go must be available in your environment, downloadable [here](https://go.dev/dl/).

### Command Line Version

```bash
# Clone the code
git clone https://github.com/chaitin/blazehttp.git && cd blazehttp
# Local compilation
bash build.sh # Upon execution, locate 'blazehttp' in the 'build' directory
# Run
./blazehttp -t https://example.org
```

### GUI Version

The GUI is implemented using [fyne](https://github.com/fyne-io/fyne).

```bash
# Clone the code
git clone https://github.com/chaitin/blazehttp.git && cd blazehttp
# Local run
go run gui/main.go
```

![gui](https://github.com/chaitin/blazehttp/assets/30664688/3d7f90aa-eb6d-43b0-adea-251114c6ea43)

> For local packaging needs, consult the fyne [packaging documentation](https://docs.fyne.io/started/packaging)
> To facilitate cross-platform packaging, refer to [fyne-cross](https://docs.fyne.io/started/cross-compiling)

## Contributions

Looking forward to contributions from anyone, whether it involves adding new samples, features, bug fixes, performance enhancements, and more. Your efforts are greatly appreciated and welcomed 👏

## Star

If you find it useful, don't hesitate to mark it with a Star ✨
