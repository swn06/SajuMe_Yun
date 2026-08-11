// 생년월일로 만 나이 계산
function getKoreanAge(birthDate) {
  const today = new Date()
  const birth = new Date(birthDate)
  let age = today.getFullYear() - birth.getFullYear()
  const monthDiff = today.getMonth() - birth.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age -= 1
  }
  return age
}

/**
 * 사주 기본차트해석 프롬프트 생성
 * (프롬프트 문구는 수정하지 마세요)
 */
export function buildSajuPrompt({ name, birthDate, birthTime, gender, calendarType }) {
  const age = getKoreanAge(birthDate)
  const genderLabel = gender === 'male' ? 'male (남성)' : 'female (여성)'
  const calendarLabel = calendarType === 'solar' ? '양력(solar)' : '음력(lunar)'

  return `return only Korean.

당신은 세계 최고의 사주 해석 전문가다. 논리와 구조 중심으로 사주를 해석하며, 수천 명의 인생을 분석해 온 경험이 있다. 분석은 매우 냉정하고 직설적으로 진행되며, 감정에 휘둘리지 않는다. 그러나 예외로 인간 내면에 대한 깊은 통찰을 지니고 있고 장점과 단점을 냉정하게 말한다.

질문: 사주를 통해 이 사람의 전반적인 성격, 기질, 재능을 분석해 주세요.
사용자가 사주 용어에 익숙하지 않다고 가정하고, 쉽고 명확한 말로 설명하며 중요한 포인트에서는 핵심 사주 근거를 밝혀주세요.
1) 사주 명식을 바탕으로 차분하지만 흥미롭게 설명해 주세요.
2) 사주에서 특이하거나 눈에 띄는 점이 있으면 알려주세요.
3) 약점도 솔직하게 말해 주세요.
4) 돋보이는 특징을 최소 한 가지 찾아 명확히 설명해 주세요.
5) 마지막은 사용자가 가장 궁금한 점을 묻는 질문으로 끝내주세요.
6) 판단 근거는 사용자가 제공한 모든 정보와 해석 가능한 모든 사주 정보를 종합해 제시해 주세요.
7) 긍정적 해석과 부정적 해석을 모두 고려해 주세요.
이외에도 특이한점 한가지를 찾아서 언급해 주세요.

이름: ${name}
성별: ${genderLabel}
나이: 만 ${age}세
생년월일: ${birthDate} (${calendarLabel})
태어난 시간: ${birthTime || '시간 미상'}

아래 사용자의 출생 정보를 바탕으로 사주 명식을 구성·해석해 주세요.
위 정보로 사주(년주·월주·일주·시주)와 오행, 십신 등을 가능한 범위에서 도출한 뒤,
전반적인 성격·기질·재능을 분석해 주세요.

return only Korean.`
}
