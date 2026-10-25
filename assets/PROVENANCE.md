# ImageGen 자산 제작 기록

모든 이미지는 2026-10-25 내장 `image_gen` 도구로 새로 생성했습니다. 외부 게임 이미지를 다운로드하거나 복제하지 않았습니다. 인물은 실존 인물의 사진을 사용하지 않은 가상 한국 성인입니다. 프롬프트의 나이 범위는 시뮬레이션의 최소 나이 20세와 별개로 외형 제작용 성인 범위입니다.

## environment.png

Use case: photorealistic-natural. Asset type: PC tycoon game wide background plate, landscape 3:2. Photorealistic architectural photograph, straight-on eye-level view in Seoul Yongsan Hangang-ro, contemporary Seoul midrise buildings on left and right edges, distant Namsan tower faint in hazy afternoon sky, concrete sidewalk and quiet street foreground. CENTER 65 percent of image is unobstructed empty pale sky and vacant open lot, reserved for separately composited 5-floor building game. Real concrete, aged brick, Korean urban neighborhood, restrained warm daylight, cinematic documentary photography. No people in center, no UI, no text, no watermarks.

## interior.png

Use case: photorealistic-natural. Asset type: repeatable room background for front-view apartment cutaway browser game, wide landscape 3:2. Render a single Seoul officetel studio apartment architectural cutaway as if the front wall was removed, absolutely straight-on orthographic camera, no isometric perspective, photorealistic materials, realistic tiny Korean studio: left sleeping area with low bed and beige blanket and window, center open floor in front of small desk with monitor, right small kitchenette, at far right a CLOSED frosted-glass bathroom door occupying final 22 percent width, bathroom privacy. Warm wood floor, pale plaster, concrete ceiling, soft sunlight, detailed lived-in fabrics, no people anywhere, no lettering, no UI, no labels, no watermark. Full room fills frame edge to edge. Match natural adult proportions; door 2.1m tall.

## characters.png

Use case: photorealistic-natural. Asset type: transparent character sprite sheet for PC apartment life simulator. Exactly EIGHT different fully clothed Korean ADULTS all aged 25 to 35, four men then four women. Full body front view natural standing neutral pose, feet aligned, all same scale, separated into eight equally wide columns in one horizontal row, no overlapping, no cropping of heads or feet. Everyday contemporary Seoul casual and work clothes, different natural faces, black or dark brown hair, realistic anatomy and skin photograph quality, soft studio light consistent from upper left. No cartoon, no vector, no illustration, no big eyes, no text, no UI. Transparent background, isolated cutouts with genuine alpha. Wide landscape sheet.

Background extraction follow-up: Remove ALL studio background and shadows between and around the people to TRUE TRANSPARENT ALPHA. Keep all eight fully clothed adult Korean people, exactly their existing faces, clothing, full bodies, pose, size, positions and evenly spaced eight column arrangement. No new background, no checkerboard painted into the image. Each person must be an isolated cutout over actual transparent pixels. Preserve original wide canvas framing.

## facade.png

Use case: photorealistic-natural. Asset type: front elevation exterior texture for Seoul building management game. A complete contemporary five-storey Korean officetel apartment building photographed in perfectly straight-on orthographic front elevation, EXACTLY five floors and EXACTLY four apartment window bays on each floor, total twenty identical window bays, symmetrical grid, rectangular building. Warm pale grey concrete and weathered brick facade, vertical slim metal divisions, rooftop utility plant behind parapet, ground level simple entrance, realistic glass windows reflecting Seoul sky, architectural photography, fine concrete details, absolutely no people no cars no vegetation blocking the facade. Building fills the frame to all edges, wide landscape composition 3:2, neutral daylight, no writing, no logos, no UI, no watermark. This image will be covered by interactive room layers, so prioritize believable exterior materials and roof.

생성 결과는 게임의 데이터 구조와 달리 기하학적 정합성을 보장하지 않습니다. 정확한 20호실 수는 코드의 5×4 그리드가 결정하며 외관 그림은 분위기용입니다.

