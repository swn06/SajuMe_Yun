export const MASCOT_POSES = {
  bow: { src: encodeURI('/assets/인사.png'), line: '명을 보러 왔다냥.' },
  meet: { src: encodeURI('/assets/반가워요.png'), line: '무냥이다냥. 네 명을 기억하겠다냥.' },
  reading: { src: encodeURI('/assets/신나.png'), line: '명을 풀어보는 중이다냥…' },
  glare: { src: encodeURI('/assets/신나.png'), line: '자, 네 명을 보았다냥.' },
}

export function mascotSrc(poseKey) {
  return (MASCOT_POSES[poseKey] || MASCOT_POSES.bow).src
}

export function mascotLine(poseKey) {
  return (MASCOT_POSES[poseKey] || MASCOT_POSES.bow).line
}
