# 여성 입주자 이미지 풀 (30명)

`scripts/cast-roster.mjs`가 woman-05 ~ woman-30의 나이·라벨·인상 설명(프롬프트)을 갖고 있고, `cast.js`의 `CAST`와 같은 내용이어야 합니다(`tests/cast.test.mjs`가 확인).

- woman-01 ~ 04: 기존 이미지 유지.
- woman-05 ~ 08: 기존 이미지가 서로 비슷해 새 인상으로 재생성 대상(`redo`).
- woman-09 ~ 30: 신규. 헤어 색·길이·질감, 얼굴형, 피부톤, 체형, 안경·피어싱·교정기 같은 소품, 옷 색을 서로 다르게 지정했습니다.

모델은 `qwen/qwen-image-2.1-turbo`(OpenRouter Image API)이며 `AGENTS.md` 지침을 따릅니다. 배경은 UI 타일 색과 맞춘 단색 `#26233D`로 요청하고, 기존 투명 배경 이미지와 함께 쓰입니다. 모든 인물은 가상의 성인이며 가리는 홈웨어를 입은 정면 전신으로 생성합니다.

## 생성

```sh
npm run cast:generate -- --redo
```

실제 파일이 있는 인물만 `cast-ready.js`에 등록되어 배정 대상이 됩니다. 생성 결과가 마음에 들지 않으면 `--only woman-12 --force`로 한 명만 다시 만들 수 있습니다.
