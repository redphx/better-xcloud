# Better xCloud
Improve [Xbox Cloud Gaming (xCloud)](https://www.xbox.com/play/) experience.  
The main target of this script is Android users, but it should work great on desktop too.

## Features:

<img width="474" alt="screenshot" src="https://github.com/redphx/better-xcloud/assets/96280/a0e85915-4e3f-4c1b-8885-eda1c712eeb6">

- Switch region of streaming server.
- Prefer IPv6 streaming server (might improve latency).
- Force HD stream by disabling bandwidth checking -> xCloud always tries to use the best possible quality.
- Skip Xbox splash video.
- Make the top-left dots icon invisible while playing. You can still click on it, but it doesn't block the screen anymore.
- Adjust video filters (brightness/contrast/saturation).
- Hide footer and other UI elements.
- Reduce UI animations (the smooth scrolling cannot be disabled).
- Disable social features (friends, chat...).
- Disable xCloud analytics. The analytics contains statistics of your streaming session, so I'd recommend to enable analytics to help Xbox improve xCloud's experence in the future.  

## How to use:
1. Install [Tampermonkey extension](https://www.tampermonkey.net/) on suppported browsers. It's also available for Firefox on Android.
2. Install **Better xCloud**:
    - [Directly on Github](https://github.com/redphx/better-xcloud/releases/latest/download/better-xcloud.user.js)
4. Refresh [xCloud web page](https://www.xbox.com/play/).
5. Click on the new "SERVER NAME" button next to your profile picture to adjust settings.
6. Optional but recommended: change your browser's User-Agent. Check the [User-Agent section](#user-agent) below for more info.
7. Don't forget to reload the page after changing settings.

## User-Agent
Optional, as changing User-Agent won't guarantee a better streaming experience, but it's worth a try. You might need to install an external extension to do that.  

It's recommended to change User-Agent to:
```
Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36 Edg/114.0.1823.67
```
This will trick xCloud into thinking you're using Edge browser on desktop.

Other options (only do one of these):
- Add ` smarttv` to switch to Smart TV layout.
- Add ` Xbox;` to become an Xbox console.
- Add ` 36102dd3-6953-45f6-8b48-031fb95e0e0d` to become a Logitech G Cloud device.
- Add ` 0ed22b6f-b61d-41eb-810a-a1ed586a550b` to become a Razer Edge device.

## Tested on:
- Chrome on macOS.
- Firefox for Android with Tampermonkey add-on.
- *(NOT RECOMMENDED at the moment since its Userscript implementation is not working properly)* [Hermit Browser](https://hermit.chimbori.com) on Android. It supports custom User-Agent and has built-in Userscript support (premium features, only $7.99) so you don't have to install anything else. I built **Better xCloud** just so I could use it with Hermit.  

## FAQ
1. **Why is it an Userscript and not extension?**  
It's because not many browsers on Android support installing extensions (and not all extensions can be installed).

2. **I see "???" button instead of server's name**  
That means Tampermonkey is not working properly. Please make sure you're using the latest version or switch to a well-known browser.  

3. **Can I use this with the Xbox Android app?**  
No you can't. You'll have to modify the app.

4. **Will you able to enable "Clarity Boost" feature on non-Edge browsers?**  
No. "Clarity Boost" feature uses an exclusive API (`Video.msVideoProcessing`) that's only available on Edge browser for desktop at the moment.

## Acknowledgements  
**Better xCloud** is inspired by these projects:  
- [n-thumann/xbox-cloud-server-selector](https://github.com/n-thumann/xbox-cloud-server-selector)  

## Disclaimers  
- Use as your own risk.  
- This project is not affiliated with Xbox in any way. All Xbox logos/icons/trademarks are copyright of their respective owners.

