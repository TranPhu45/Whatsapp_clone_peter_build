// import { randomID } from "@/lib/utils";
// import { useClerk } from "@clerk/nextjs";
// import { ZegoUIKitPrebuilt } from "@zegocloud/zego-uikit-prebuilt";

// export function getUrlParams(url = window.location.href) {
// 	let urlStr = url.split("?")[1];
// 	return new URLSearchParams(urlStr);
// }

// export default function VideoUIKit() {
// 	const roomID = getUrlParams().get("roomID") || randomID(5);
// 	const { user } = useClerk();

// 	let myMeeting = (element: HTMLDivElement) => {
// 		const initMeeting = async () => {
// 			const res = await fetch(`/api/zegocloud?userID=${user?.id}`);
// 			const { token, appID } = await res.json();

// 			const username = user?.fullName || user?.emailAddresses[0].emailAddress.split("@")[0];

// 			const kitToken = ZegoUIKitPrebuilt.generateKitTokenForProduction(appID, token, roomID, user?.id!, username);

// 			const zp = ZegoUIKitPrebuilt.create(kitToken);
// 			zp.joinRoom({
// 				container: element,
// 				sharedLinks: [
// 					{
// 						name: "Personal link",
// 						url:
// 							window.location.protocol +
// 							"//" +
// 							window.location.host +
// 							window.location.pathname +
// 							"?roomID=" +
// 							roomID,
// 					},
// 				],
// 				scenario: {
// 					mode: ZegoUIKitPrebuilt.GroupCall, // To implement 1-on-1 calls, modify the parameter here to [ZegoUIKitPrebuilt.OneONoneCall].
// 				},
// 			});
// 		};
// 		initMeeting();
// 	};

// 	return <div className='myCallContainer' ref={myMeeting} style={{ width: "100vw", height: "100vh" }}></div>;
// }
import { randomID } from "@/lib/utils";
import { useClerk } from "@clerk/nextjs";
import { ZegoUIKitPrebuilt } from "@zegocloud/zego-uikit-prebuilt";
import { useEffect, useRef } from "react";

export function getUrlParams(url = window.location.href) {
  const urlStr = url.split("?")[1];
  return new URLSearchParams(urlStr);
}

export default function VideoUIKit() {
  const roomID = getUrlParams().get("roomID") || randomID(5);
  const { user } = useClerk();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const zpInstance = useRef<any>(null);

  useEffect(() => {
    const initMeeting = async () => {
      if (!containerRef.current || !user || zpInstance.current) {
        console.warn("Skipping initialization: Invalid user or container.");
        return;
      }

      try {
        const res = await fetch(`/api/zegocloud?userID=${user?.id}`);
        if (!res.ok) {
          throw new Error("Failed to fetch ZEGOCLOUD token.");
        }

        const { token, appID } = await res.json();

        const username =
          user?.fullName ||
          user?.emailAddresses[0].emailAddress.split("@")[0];

        const kitToken = ZegoUIKitPrebuilt.generateKitTokenForProduction(
          appID,
          token,
          roomID,
          user?.id!,
          username
        );

        const zp = ZegoUIKitPrebuilt.create(kitToken);
        zpInstance.current = zp;

        zp.joinRoom({
          container: containerRef.current,
          sharedLinks: [
            {
              name: "Personal link",
              url:
                window.location.protocol +
                "//" +
                window.location.host +
                window.location.pathname +
                "?roomID=" +
                roomID,
            },
          ],
          scenario: {
            mode: ZegoUIKitPrebuilt.GroupCall,
          },
        });
      } catch (error) {
        console.error("Error initializing meeting:", error);
      }
    };

    initMeeting();

    return () => {
      if (zpInstance.current) {
        zpInstance.current.destroy();
        zpInstance.current = null;
      }
    };
  }, [roomID, user?.id, user?.fullName, user?.emailAddresses]);

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <div
      className="myCallContainer"
      ref={containerRef}
      style={{ width: "100vw", height: "100vh" }}
    ></div>
  );
}
