# Better xCloud
Improve [Xbox Cloud Gaming (xCloud)](https://www.xbox.com/play/) experience on web browser.  
The main target of this script is Android users, but it should work great on desktop too.

## Features

<img width="500" alt="Settings UI" src="https://github.com/redphx/better-xcloud/assets/96280/db9b4f88-6958-4ec8-90cb-3cf37da5ab26">  
<img width="500" alt="Video Settings UI" src="https://github.com/redphx/better-xcloud/assets/96280/130aa870-6938-4604-9e23-45e217b800cc">


- Switch region of streaming server.
- Prefer IPv6 streaming server (might reduce latency).
- Force HD stream by disabling bandwidth checking -> xCloud always tries to use the best possible quality.
- Skip Xbox splash video (save 3 seconds).
- Make the top-left dots icon invisible while playing. You can still click on it, but it doesn't block the screen anymore.
- Stretch video to full sctreen. Useful when you don't have a 16:9 screen.
- Adjust video filters (brightness/contrast/saturation).
- Hide footer and other UI elements.
- Reduce UI animations (the smooth scrolling cannot be disabled).
- Disable social features (friends, chat...).
- Disable xCloud analytics. The analytics contains statistics of your streaming session, so I'd recommend to allow analytics to help Xbox improve xCloud's experence in the future.  

## How to use
1. Install [Tampermonkey extension](https://www.tampermonkey.net/) on suppported browsers. It's also available for Firefox on Android.
2. Install **Better xCloud**:
    - [Stable version](https://github.com/redphx/better-xcloud/releases/latest/download/better-xcloud.user.js)
    - [Dev version](https://github.com/redphx/better-xcloud/raw/main/better-xcloud.user.js)  
4. Refresh [xCloud web page](https://www.xbox.com/play/).
5. Click on the new "SERVER NAME" button next to your profile picture to adjust settings.  
6. Optional but recommended: change your browser's User-Agent. Check the [User-Agent section](#user-agent) below for more info.
7. Don't forget to enable auto updating for the script in Tampermonkey.

To update, just install the script again (you won't lose your settings).

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

## Compatibility
✅ = confirmed to be working  
❓ = not yet tested  
❌ = not supported (mostly because of lacking Userscript/extension support)  
⚠️ = see custom notes  
|                                        | Desktop  | Android          | iOS |
|----------------------------------------|----------|------------------|-----|
| Chrome/Edge/Chromium variants          | ✅       | ❌               | ❌   |
| Firefox                                | ✅       | ✅               | ❌   |
| Safari                                 | ❓       | ❌               | ❓   |
| [Hermit](https://hermit.chimbori.com)  | ❌       | ⚠️<sup>(1)</sup> | ❌   |

Don't see your browser in the table? If it supports Tampermonkey/Userscript then the answer is likely **"YES"**.
  
<sup>1</sup> NOT RECOMMENDED at the moment since its Userscript implementation is not working properly. Non-network related features (skip splash video, video settings...) still work. It's still my favorite app to play xCloud on because it's lightweight, supports both custom User-Agent and Userscript (premium features, only $1.99 for Userscript feature or $7.99 if you want both) without having to install anything else. I built **Better xCloud** just so I could use it with Hermit.  

## FAQ
1. **Will I get banned for using this?**  
I think it's very unlikely that you'll get banned for using this. Most of the features only affect client-side, except for switching region of streaming server (you'll connect to another server instead of the default one). If you want to be safe just avoid using that. As always, use as your own risk.

2. **Why is it an Userscript and not extension?**  
It's because not many browsers on Android support installing extensions (and not all extensions can be installed).

3. **I see "???" button instead of server's name**  
That means Tampermonkey is not working properly. Please make sure you're using the latest version or switch to a well-known browser.  

4. **Can I use this with the Xbox Android app?**  
No you can't. You'll have to modify the app.

5. **Will you able to enable "Clarity Boost" feature on non-Edge browsers?**  
No. "Clarity Boost" feature uses an exclusive API (`Video.msVideoProcessing`) that's only available on Edge browser for desktop at the moment.

## Acknowledgements  
- [n-thumann/xbox-cloud-server-selector](https://github.com/n-thumann/xbox-cloud-server-selector) for the idea of IPv6 feature
- Icons by [Adam Design](https://www.iconfinder.com/iconsets/user-interface-outline-27)

## Disclaimers  
- Use as your own risk.  
- This project is not affiliated with Xbox in any way. All Xbox logos/icons/trademarks are copyright of their respective owners.

