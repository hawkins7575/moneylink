const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);

const mongoose = require('mongoose');
const fs = require('fs');
require('dotenv').config();
const Post = require('./models/Post');

const postsData = [
    {
        title: "[반도체] 2026년 HBM4 전환기, 삼성전자와 SK하이닉스의 기술 로드맵 분석",
        author: "금융분석가",
        email: "semianalyst@moneylink.com",
        imageName: "hbm4_roadmap.png",
        imageAlt: "HBM4 반도체 적층 패키징 기술 로드맵",
        content: `
            <p>2026년은 글로벌 반도체 시장, 특히 인공지능(AI) 메모리 분야에서 기념비적인 해가 될 것입니다. 바로 차세대 메모리 규격인 <strong>HBM4(고대역폭 메모리 4세대)</strong>의 본격적인 양산과 세대 전환이 이루어지는 시기이기 때문입니다. 기존 HBM3E까지는 독자적인 다이(Die) 설계 방식으로 대응할 수 있었으나, HBM4부터는 파운드리 파트너십과 고도의 패키징 기술력이 승패를 가르는 핵심 변수로 부상하고 있습니다.</p>

            <img src="/images/hbm4_roadmap.png" alt="HBM4 반도체 적층 패키징 기술 로드맵" title="HBM4 반도체 적층 패키징 기술 로드맵" loading="lazy" style="width: 100%; max-width: 680px; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.3); margin: 20px 0; display: block;" />

            <h3>1. HBM4 규격 변화와 파운드리 동맹의 탄소 촉매</h3>
            <p>HBM4의 가장 큰 구조적 변화는 기존 1024비트의 인터페이스 버스 폭이 <strong>2048비트</strong>로 두 배 확장된다는 점입니다. 버스 폭이 두 배로 늘어나면서 베이스 다이(Base Die)의 신호 전송 속도와 밀도가 한계에 달하게 되었고, 이로 인해 베이스 다이의 제작 공정이 기존 메모리 공정에서 파운드리(위탁생산) 초미세 공정으로 전환이 불가피해졌습니다.</p>
            <ul>
                <li><strong>SK하이닉스</strong>: 파운드리 1위 기업인 TSMC와의 전략적 동맹을 더욱 굳건히 하고 있습니다. TSMC의 5나노/3나노 초미세 공정을 활용해 HBM4 베이스 다이를 설계하여, 성능과 전력 효율성을 극대화하는 로드맵을 고수하고 있습니다.</li>
                <li><strong>삼성전자</strong>: 메모리, 파운드리, 어드밴스드 패키징(AVP)을 모두 자체 수행할 수 있는 '원스톱 턴키(Turnkey) 서비스'를 무기로 내세우고 있습니다. 자사 파운드리 4나노 공정을 활용한 베이스 다이 제조부터 메모리 적층까지 수직 계열화된 통합 솔루션으로 비용과 납기 면에서 경쟁력을 확보하겠다는 전략입니다.</li>
            </ul>

            <div style="background-color: rgba(255, 255, 255, 0.05); padding: 15px; border-radius: 8px; border-left: 4px solid #3b82f6; margin: 15px 0;">
                <strong>💡 핵심 테이크어웨이:</strong> HBM4 공급망은 단일 메모리 반도체 공급 차원을 넘어, 팹리스(NVIDIA 등)-파운드리(TSMC)-메모리제조사(SK하이닉스/삼성전자) 간의 글로벌 '이종 집적 연합군' 싸움으로 진화하고 있습니다.
            </div>

            <h3>2. 주가 핵심 모멘텀 및 리스크 요인</h3>
            <p>투자 관점에서는 두 기업의 수율(Yield) 안정화 시점과 고객사(NVIDIA, AMD 등) 퀄테스트(Quality Test) 통과 속도가 향후 1년간의 주가 향방을 결정할 예정입니다. 2026년 상반기 프로토타입 검증 단계에서 성능 우위를 점하는 기업이 초기 HBM4 시장 점유율의 70% 이상을 독식할 것으로 전문가들은 내다보고 있습니다.</p>
        `
    },
    {
        title: "[거시경제] 미 연준(Fed) 금리 정책 변화가 국내 코스피(KOSPI)에 미치는 영향",
        author: "거시전략가",
        email: "macro@moneylink.com",
        imageName: "fed_rates_kospi.png",
        imageAlt: "미 연준 금리 인하 및 코스피 지수 추이 전망",
        content: `
            <p>글로벌 주식 시장의 모든 이목이 미국 연방준비제도(Fed, 연준)의 통화정책 회의에 집중되고 있습니다. 금리 인상 사이클이 종식되고 본격적인 <strong>금리 인하 국면</strong>으로 접어들면서, 신흥국 시장인 한국의 KOSPI 지수가 어떤 모멘텀을 맞이할지 거시경제적 관점에서 분석합니다.</p>

            <img src="/images/fed_rates_kospi.png" alt="미 연준 금리 인하 및 코스피 지수 추이 전망" title="미 연준 금리 인하 및 코스피 지수 추이 전망" loading="lazy" style="width: 100%; max-width: 680px; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.3); margin: 20px 0; display: block;" />

            <h3>1. 달러 약세와 외국인 매수세 유입 경로</h3>
            <p>미 연준의 기준금리 인하는 필연적으로 달러화 약세(원/달러 환율 하락) 요인으로 작용합니다. 원화 가치가 강세를 보이면 외국인 투자자 입장에서는 한국 주식을 매수할 때 주가 상승에 따른 수익뿐만 아니라 <strong>환차익(FX Gain)</strong>까지 추가로 얻을 수 있는 환경이 조성됩니다.</p>
            <ul>
                <li>외국인 매수세는 KOSPI 시가총액 상위 대형주(반도체, 자동차 등)에 집중되는 경향이 강합니다.</li>
                <li>한미 금리차 역전 현상이 축소되면서 국내 채권 시장 및 주식 시장에서의 자금 유출 우려가 완화됩니다.</li>
            </ul>

            <div style="background-color: rgba(255, 255, 255, 0.05); padding: 15px; border-radius: 8px; border-left: 4px solid #10b981; margin: 15px 0;">
                <strong>📊 업종별 영향 분석:</strong> 금리 하락 국면에서는 자금 조달 비용 비중이 높은 IT 성장주, 제약/바이오 업종이 강한 밸류에이션 리레이팅(Re-rating) 수혜를 받으며, 은행 및 보험 등 금융 업종은 예대마진 축소 우려로 단기 조정을 겪을 수 있습니다.
            </div>

            <h3>2. 투자자를 위한 장기 포트폴리오 제언</h3>
            <p>다만 연준의 금리 인하가 '경기 침체 방어용(Recession Cut)'인지 '물가 안정에 따른 정상화(Soft Landing Cut)'인지 구분해야 합니다. 경기 연착륙 흐름 속에서 점진적으로 내리는 금리는 KOSPI에 강력한 우상향 연료를 제공할 것입니다.</p>
        `
    },
    {
        title: "[밸류업] 코리아 디스카운트 해소? '기업 밸류업 프로그램' 수혜 기업 분석",
        author: "가치투자연구소",
        email: "valueup@moneylink.com",
        imageName: "korea_valueup.png",
        imageAlt: "기업 밸류업 프로그램 주주환원 모델",
        content: `
            <p>한국 주식 시장의 고질적인 저평가 현상인 '코리아 디스카운트'를 정조준한 정부의 <strong>'기업 밸류업 프로그램'</strong> 가이드라인이 강화되고 있습니다. 자율 공시를 넘어 세제 혜택과 연계되면서, 주주 환원을 강화하고 자본 효율성을 개선하려는 상장사들의 자발적 움직임이 빨라지고 있습니다. 본 리포트에서는 실제 수혜를 입을 저PBR 및 고ROE 기업군을 스크리닝합니다.</p>

            <img src="/images/korea_valueup.png" alt="기업 밸류업 프로그램 주주환원 모델" title="기업 밸류업 프로그램 주주환원 모델" loading="lazy" style="width: 100%; max-width: 680px; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.3); margin: 20px 0; display: block;" />

            <h3>1. 저PBR 자산주에서 고ROE 주주환원주로의 이동</h3>
            <p>과거에는 단순히 장부상 자산이 많고 주가가 자산 가치보다 낮은 '저PBR(순자산비율)' 종목들이 밸류업 테마의 중심이었으나, 현시점에서는 <strong>주주환원율(배당+자사주 매입 소각)을 실제로 대폭 상향할 여력이 있는 기업</strong>만이 진정한 밸류업 종목으로 평가받고 있습니다.</p>
            <ul>
                <li><strong>완성차 대형주(현대차, 기아)</strong>: 풍부한 잉여현금흐름(FCF)을 바탕으로 매년 배당금을 증액하고 대규모 자사주를 소각하여 주당순이익(EPS)을 비약적으로 증가시키고 있습니다.</li>
                <li><strong>메이저 금융지주(KB금융, 신한지주, 하나금융지주)</strong>: 분기 균등 배당 도입과 총주주환원율 40% 이상 가이던스를 앞다투어 공시하며, 주가 하방 지지선을 견고히 다지고 있습니다.</li>
            </ul>

            <div style="background-color: rgba(255, 255, 255, 0.05); padding: 15px; border-radius: 8px; border-left: 4px solid #f59e0b; margin: 15px 0;">
                <strong>🔍 밸류업 핵심 선별 공식:</strong> [ROE(자기자본이익률) > 8%] 이면서 [PBR < 1.0] 인 동시에 [현금 배당 수익률 > 5%]인 종목들이 장기적 기관 및 외국인 밸류업 펀드 자금의 유입 영순위 타깃입니다.
            </div>

            <h3>2. 세제 개편안과 개인 투자자의 대응</h3>
            <p>배당소득에 대한 분리과세 혜택과 자사주 소각 기업에 대한 법인세 감면이 현실화될 경우, 국내 큰손 투자자들의 자금이 빠르게 밸류업 지수 편입 종목으로 이동할 가능성이 매우 높습니다. 배당 매력과 이익 체력을 겸비한 우량 대형주 중심의 분할 매수 접근을 권고합니다.</p>
        `
    },
    {
        title: "[AI 혁명] AI 디바이스(온디바이스 AI) 시대 개막과 수혜주 발굴 가이드",
        author: "테크분석가",
        email: "techtrends@moneylink.com",
        imageName: "ondevice_ai.png",
        imageAlt: "온디바이스 AI 스마트폰 칩셋 작동 원리",
        content: `
            <p>클라우드 서버에 접속하지 않고 스마트폰, PC, 웨어러블 등 기기 내부에서 자체적으로 인공지능 연산을 처리하는 <strong>온디바이스 AI(On-Device AI)</strong> 시대가 본격적으로 열렸습니다. 서버 비용 절감, 저지연(Low Latency), 그리고 철저한 개인정보 보호라는 독보적 장점으로 인해 하이테크 하드웨어 시장의 새로운 표준으로 확립되고 있습니다.</p>

            <img src="/images/ondevice_ai.png" alt="온디바이스 AI 스마트폰 칩셋 작동 원리" title="온디바이스 AI 스마트폰 칩셋 작동 원리" loading="lazy" style="width: 100%; max-width: 680px; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.3); margin: 20px 0; display: block;" />

            <h3>1. 모바일 및 PC 엣지 디바이스 NPU 탑재 레이스</h3>
            <p>애플의 Apple Intelligence 탑재 기기 라인업 확대와 글로벌 안드로이드 진영의 플래그십 모델 전면 AI화로 기기당 탑재되는 메모리 반도체(DRAM) 용량이 평균 30~50% 급격히 증가하고 있습니다. 연산을 빠르게 보조하기 위한 고성능 NPU(신경망처리장치) 탑재 트렌드는 관련 소부장(소재·부품·장비) 기업들에 거대한 낙수 효과를 줍니다.</p>
            <ul>
                <li><strong>시스템 LSI 및 디자인하우스</strong>: 독자 NPU를 칩셋 형태로 레이아웃화하여 파운드리로 넘겨주는 IP 기업들과 브릿지 역할을 해주는 국내 대표 디자인하우스 기업들의 장기 수혜가 예상됩니다.</li>
                <li><strong>초미세 검사 및 후공정 패키징</strong>: 모바일 AP의 복잡도가 극대화됨에 따라 고신뢰성 패키징 기술(SiP, PoP 등)과 초미세 테스터 보드 장비 업체들의 단기 실적 턴어라운드가 강력하게 나타나고 있습니다.</li>
            </ul>

            <div style="background-color: rgba(255, 255, 255, 0.05); padding: 15px; border-radius: 8px; border-left: 4px solid #ec4899; margin: 15px 0;">
                <strong>💡 장기 성장성 관점:</strong> 스마트폰에 머무르던 온디바이스 AI는 스마트 카(자율주행), 드론, 스마트 홈 로봇으로 영역을 급격히 확장하고 있으며, 이는 엣지 디바이스용 AI 전용 칩셋 수요 폭증으로 귀결됩니다.
            </div>
        `
    },
    {
        title: "[배당주] 고금리 장기화 속 안정적 수익을 내는 분기 배당주 & 고배당 ETF 전략",
        author: "자산관리사",
        email: "wealth@moneylink.com",
        imageName: "dividend_stocks.png",
        imageAlt: "안정적 분기 고배당주 및 ETF 포트폴리오 구성",
        content: `
            <p>시장 불확실성이 지속되고 인플레이션 우려로 고금리 기조가 고착화될 때, 투자자들의 가장 믿음직한 안식처는 단연 <strong>고배당주</strong>와 분기별로 배당금이 꼬박꼬박 나오는 <strong>배당성장형 ETF</strong>입니다. 주가 등락 스트레스를 줄이고 인컴(Income) 수익을 극대화할 수 있는 영리한 고배당 포트폴리오 설계 요령을 공개합니다.</p>

            <img src="/images/dividend_stocks.png" alt="안정적 분기 고배당주 및 ETF 포트폴리오 구성" title="안정적 분기 고배당주 및 ETF 포트폴리오 구성" loading="lazy" style="width: 100%; max-width: 680px; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.3); margin: 20px 0; display: block;" />

            <h3>1. 연 7%대 배당률을 유지하는 분기 배당 대장주 스크리닝</h3>
            <p>단순히 배당 수익률만 높은 '고배당의 함정(Dividend Trap)'을 피해야 합니다. 실적이 꺾이는데 무리해서 배당을 주다가 주가가 동반 폭락하는 종목을 배제하고, 현금 창출력과 실적 안정성을 증명한 국내 분기 배당 대표 기업들을 주목해야 합니다.</p>
            <ul>
                <li>금융지주 및 통신 3사(SK텔레콤, KT)는 견고한 내수 비즈니스를 기반으로 업계 최고 수준의 배당 유지력을 증명하고 있습니다.</li>
                <li>최근 세법 개정 분위기와 맞물려 배당 가시성이 높은 배당성장 테마 기업들이 재평가받고 있습니다.</li>
            </ul>

            <div style="background-color: rgba(255, 255, 255, 0.05); padding: 15px; border-radius: 8px; border-left: 4px solid #14b8a6; margin: 15px 0;">
                <strong>⭐ 배당주 투자 전 체크리스트:</strong> 배당성향(Payout Ratio)이 70%를 넘지 않는지 점검하고, 기업의 연간 영업이익이 최소 전년 수준을 유지할 수 있는 경기 방어 성격의 종목을 최우선으로 선별하십시오.
            </div>
        `
    },
    {
        title: "[미국주식] M7(Magnificent 7) 독주 체제 균열? 차세대 빅테크 유망주 분석",
        author: "글로벌전략가",
        email: "globalstocks@moneylink.com",
        imageName: "next_bigtech_m7.png",
        imageAlt: "차세대 미국 빅테크 M7 주식 전망",
        content: `
            <p>지난 몇 년간 글로벌 금융 시장의 랠리를 압도적으로 지휘했던 <strong>M7(애플, 마이크로소프트, 알파벳, 아마존, 엔비디아, 메타, 테슬라)</strong>의 독주 체제에 미묘한 기류 변화가 관찰되고 있습니다. 높은 밸류에이션 부담과 차별화된 AI 실적 성적표에 따라 빅테크 내에서도 양극화가 심화되는 가운데, 시장의 새로운 중심축으로 부상 중인 차세대 빅테크 후보군을 점검합니다.</p>

            <img src="/images/next_bigtech_m7.png" alt="차세대 미국 빅테크 M7 주식 전망" title="차세대 미국 빅테크 M7 주식 전망" loading="lazy" style="width: 100%; max-width: 680px; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.3); margin: 20px 0; display: block;" />

            <h3>1. AI 하드웨어에서 소프트웨어 및 네트워크로의 패러다임 전이</h3>
            <p>엔비디아가 쏘아 올린 AI 칩 인프라 투자 붐은 1차 하드웨어 수혜(GPU, HBM)를 지나, 이제 대규모 AI 연산을 가능하게 하는 <strong>고대역폭 네트워크 인프라</strong> 및 실질적인 구독 모델 비즈니스를 갖춘 <strong>엔터프라이즈 AI 소프트웨어</strong> 솔루션 기업들로 급격히 분산되고 있습니다.</p>
            <ul>
                <li><strong>브로드컴(Broadcom)</strong>: AI 가속기 및 맞춤형 ASIC 칩, 초고속 이더넷 스위치 칩셋 등 독점적 네트워크 지배력을 바탕으로 M7에 준하는 폭발적인 마진율 향상을 실현하고 있습니다.</li>
                <li><strong>오라클 및 데이터 클라우드</strong>: 대기업 고객사 전용 하이브리드 클라우드 인프라(OCI) 수요 폭증으로 매 분기 실적 서프라이즈를 기록하며 새로운 테크 제왕으로의 도약을 꾀하고 있습니다.</li>
            </ul>

            <div style="background-color: rgba(255, 255, 255, 0.05); padding: 15px; border-radius: 8px; border-left: 4px solid #6366f1; margin: 15px 0;">
                <strong>💡 투자 힌트:</strong> M7 전반에 대한 맹목적인 추종 지수 투자보다는, 강력한 진입장벽과 확실한 캐시카우를 보유한 차세대 테크 섹터 대장주를 포트폴리오에 고르게 배분하는 전략이 초과 수익률(Alpha)의 열쇠입니다.
            </div>
        `
    },
    {
        title: "[이차전지] 전기차 캐즘(Chasm) 시기의 배터리 핵심 원소재 공급망 재편과 투자 기회",
        author: "소재연구소",
        email: "materials@moneylink.com",
        imageName: "ev_battery_chasm.png",
        imageAlt: "이차전지 배터리 원소재 공급망 가치사슬",
        content: `
            <p>글로벌 전기차(EV) 수요 일시 정체 현상인 <strong>캐즘(Chasm)</strong>이 장기화되며 이차전지 밸류체인 전체가 가혹한 옥석 가리기와 구조조정 시기를 견뎌내고 있습니다. 하지만 이 위기 속에서 미국 IRA(인플레이션 감축법) 가이드라인을 충족하는 <strong>원소재 공급망 재편에 성공하는 소수 우량 기업</strong>에게는 역사적인 저점 매수 기회가 열리고 있습니다.</p>

            <img src="/images/ev_battery_chasm.png" alt="이차전지 배터리 원소재 공급망 가치사슬" title="이차전지 배터리 원소재 공급망 가치사슬" loading="lazy" style="width: 100%; max-width: 680px; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.3); margin: 20px 0; display: block;" />

            <h3>1. 비중국산 광물 확보력과 양극재/음극재 포트폴리오 다각화</h3>
            <p>앞으로 글로벌 배터리 셀 제조사 및 완성차 메이커들이 채택할 핵심 기준은 '비중국산 리튬·니켈·코발트·흑연'의 조달 신뢰성입니다. 중국 의존도를 제로에 가깝게 낮춘 기업만이 북미 유럽 시장에서 보조금을 100% 수령하며 경쟁사 대비 초격차 이윤을 낼 수 있습니다.</p>
            <ul>
                <li><strong>리튬/흑연 가공 국산화 기업</strong>: 중국이 전면 장악한 리튬 정제 공정 및 천연/인조 흑연을 대체할 국내 독자 생산 거점 보유 기업들의 전략적 가치가 부각됩니다.</li>
                <li><strong>차세대 실리콘 음극재 & 전고체 고체 전해질</strong>: 캐즘 돌파구인 '충전 속도 향상'과 '안전성 확보'를 위해 실리콘 음극재 함량 확대 및 꿈의 전고체 배터리 핵심 원료 제조사들의 파일럿 라인 가동 일정에 주목해야 합니다.</li>
            </ul>

            <div style="background-color: rgba(255, 255, 255, 0.05); padding: 15px; border-radius: 8px; border-left: 4px solid #84cc16; margin: 15px 0;">
                <strong>⚠️ 업황 진단:</strong> 이차전지 업황의 실질적 반등은 리튬 가격 안정과 미국·유럽의 내연기관 규제 강도 유지 여부에 달려있습니다. 2026년을 기점으로 저품질 LFP에서 고성능 삼원계 하이엔드 배터리로 전환하는 교두보가 마련될 것입니다.
            </div>
        `
    },
    {
        title: "[초보가이드] 주식 투자 첫걸음, 재무제표에서 꼭 봐야 할 3가지 핵심 지표",
        author: "초보교실",
        email: "basics@moneylink.com",
        imageName: "financial_statement.png",
        imageAlt: "주식 초보자를 위한 재무제표 3대 핵심 지표 분석",
        content: `
            <p>초보 주식 투자자들이 가장 많이 저지르는 실수는 남의 추천 글이나 단순 풍문만 믿고 묻지마 매수를 진행하는 것입니다. 투자의 세계에서 살아남아 장기적인 수익을 거두기 위한 가장 기초적인 방어벽은 바로 <strong>재무제표</strong> 분석입니다. 어렵고 복잡한 회계 원리를 몰라도, 이것만 보면 상장 폐지나 급격한 유상증자를 피할 수 있는 3가지 핵심 지표를 요약 정리합니다.</p>

            <img src="/images/financial_statement.png" alt="주식 초보자를 위한 재무제표 3대 핵심 지표 분석" title="주식 초보자를 위한 재무제표 3대 핵심 지표 분석" loading="lazy" style="width: 100%; max-width: 680px; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.3); margin: 20px 0; display: block;" />

            <h3>1. 영업이익률(Operating Margin): 기업의 '비즈니스 펀더멘털'</h3>
            <p>아무리 매출이 조 단위에 달하더라도 실질적으로 손에 쥐는 영업이익이 마이너스이거나 지나치게 낮다면 껍데기만 화려한 기업입니다. <strong>영업이익률 = (영업이익 / 매출액) * 100</strong> 지표를 확인하여, 해당 기업이 동종 업계 평균(통상 8~10%) 이상의 강력한 가격 결정력을 지녔는지 파악해야 합니다.</p>

            <h3>2. 부채비율(Debt-to-Equity Ratio): 위기 시 버틸 수 있는 '맷집'</h3>
            <p>부채비율은 기업이 갖고 있는 자기 자본 대비 갚아야 할 빚의 비율입니다. <strong>100% 이하</strong>가 매우 우량한 상태이며, <strong>200%를 초과</strong>하는 기업은 고금리 국면에서 막대한 이자 비용 부담으로 흑자 도산하거나 주주 가치를 파괴하는 3자 배정 유상증자를 단행할 리스크가 극도로 큽니다.</p>

            <h3>3. 영업활동 현금흐름(Operating Cash Flow): 장부 상 허상을 걷어내는 '진짜 현금'</h3>
            <p>손익계산서 상 당기순이익이 흑자여도 실제 회사 통장에 들어온 돈이 마이너스라면 '흑자 부도'의 먹구름이 끼어있을 가능성이 높습니다. 영업활동 현금흐름이 항상 플러스를 유지하며 당기순이익 규모와 동행하고 있는지를 두 눈으로 반드시 대조 확인하십시오.</p>
        `
    },
    {
        title: "[바이오] 항암제 신약 파이프라인 중심의 K-바이오 글로벌 기술수출 트렌드",
        author: "바이오전문가",
        email: "kbio@moneylink.com",
        imageName: "kbio_pipeline.png",
        imageAlt: "K-바이오 글로벌 신약 파이프라인 기술수출",
        content: `
            <p>K-제약바이오 산업이 대형 복제약(시밀러) 위탁 생산 중심의 제조업 모델을 탈피하고, 자체 신약 파이프라인을 다국적 빅파마에 조 단위로 라이선스 아웃(L/O)하는 **글로벌 신약 연구개발의 핵심 주역**으로 우뚝 서고 있습니다. 글로벌 학회에서 혁신적 임상 데이터를 연달아 증명하며 주가 르네상스를 견인하고 있는 대표 바이오 플랫폼 기술군을 요약 진단합니다.</p>

            <img src="/images/kbio_pipeline.png" alt="K-바이오 글로벌 신약 파이프라인 기술수출" title="K-바이오 글로벌 신약 파이프라인 기술수출" loading="lazy" style="width: 100%; max-width: 680px; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.3); margin: 20px 0; display: block;" />

            <h3>1. 항암 혁신의 대세, ADC(항체-약물 접합체) 및 면역항암 플랫폼</h3>
            <p>최근 메가 라이선스 아웃 성과의 중심에는 암세포만 정밀 타격하여 미사일처럼 약물을 투여하는 **ADC 플랫폼 기술**과 면역 관문 억제제의 효능을 극대화하는 병용 투여 면역 플랫폼이 있습니다. 대규모 글로벌 2상, 3상 임상을 자체 수행하거나 글로벌 판권을 양도하여 상업화 마일스톤 유입 속도를 앞당기는 트렌드입니다.</p>
            <ul>
                <li>플랫폼 기술 특성상 한 개의 원천 기술로 수십 개의 표적 항원 파이프라인 확장이 가능해 리스크 분산에 탁월합니다.</li>
                <li>대기업 계열 바이오텍의 막강한 자금력과 독립 혁신 바이오 벤처의 민첩성이 융합되며 시너지가 극대화되고 있습니다.</li>
            </ul>

            <div style="background-color: rgba(255, 255, 255, 0.05); padding: 15px; border-radius: 8px; border-left: 4px solid #a855f7; margin: 15px 0;">
                <strong>🧪 임상 일정 가이드:</strong> K-바이오 투자 성공률을 높이기 위해 매년 상반기 열리는 미국 암학회(AACR) 및 임상종양학회(ASCO) 발표 리스트를 한 발 앞서 추적하고 초록 공개 시점에 팩트 체크를 필히 동반하십시오.
            </div>
        `
    },
    {
        title: "[테마분석] 우주항공 및 방위산업(K-방산) 글로벌 수출 본격화에 따른 장기 성장 로드맵",
        author: "방산연구소",
        email: "kdefense@moneylink.com",
        imageName: "kdefense_space.png",
        imageAlt: "K-방산 및 우주항공 산업 장기 로드맵",
        content: `
            <p>러시아-우크라이나 전쟁 이후 전 세계적으로 신냉전 분위기가 확산되면서 자주국방 및 안보 위기의식이 고조되고 있습니다. 이러한 급변하는 정세 속에서 뛰어난 가격 경쟁력, 신속한 납기 성능, 고품질 양산 능력 삼박자를 갖춘 <strong>K-방산</strong> 기업들의 대규모 해외 무기 수출 물량이 실적에 본격적으로 찍히기 시작했습니다. 나아가 민관 협동의 <strong>우주항공 산업</strong> 육성 계획과 결부되어 초장기 우주경제 성장 동력이 가동되고 있습니다.</p>

            <img src="/images/kdefense_space.png" alt="K-방산 및 우주항공 산업 장기 로드맵" title="K-방산 및 우주항공 산업 장기 로드맵" loading="lazy" style="width: 100%; max-width: 680px; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.3); margin: 20px 0; display: block;" />

            <h3>1. 폴란드 수출을 시작으로 루마니아, 중동, 아시아 전방위 영토 확장</h3>
            <p>K-자주포, K-전차, 경공격기 등 대표적 무기 밸류체인의 해외 수출국 라인업이 급속도로 늘고 있습니다. 방산 비즈니스 특성상 단순 장비 인도로 끝나지 않고, **수십 년간 유지·보수·운영(MRO) 서비스 매출**이 꾸준히 이어지므로 강력한 고성장 록인(Lock-in) 효과를 보장받는 구조입니다.</p>
            <ul>
                <li><strong>우주항공청 개청 및 민간 위성 발사</strong>: 우주 발사체 및 군사 정찰 위성 개발 국산화 과제가 본격화되면서 첨단 방산 통신 및 레이더 기술을 국산화한 방산 대형주들의 밸류에이션 리플레이션이 촉발되고 있습니다.</li>
                <li><strong>국내 방산 부품 소부장 상생 생태계</strong>: 탄약, 정밀 센서, 미사일 모터 등 안정적으로 하부 구조를 지탱하는 부품 중소형 강소기업들의 실적 레버리지 역시 돋보입니다.</li>
            </ul>

            <div style="background-color: rgba(255, 255, 255, 0.05); padding: 15px; border-radius: 8px; border-left: 4px solid #f43f5e; margin: 15px 0;">
                <strong>📊 핵심 모멘텀 투자 팁:</strong> 개별 수주 잔고 추이와 납품 인도 시점을 철저히 모니터링하고 환율 우호적 수혜와 원자재 가격 변동 리스크를 동시에 체크하여 중장기 복리 효과를 수취하는 전략이 유효합니다.
            </div>
        `
    }
];

async function seed() {
    try {
        console.log('🔄 Connecting to MongoDB Atlas...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB Successfully!');

        // Find existing max post ID
        const allPosts = await Post.find({}).lean();
        let maxId = 0;
        if (allPosts.length > 0) {
            maxId = Math.max(...allPosts.map(p => p.id));
        }
        if (maxId < 1000) maxId = 1780000000000; // If ids are large timestamps (like 1775137864163), start with a safe base

        console.log(`Current max ID in database: ${maxId}`);

        // Prepare posts with unique sequential IDs
        const newPosts = [];
        const baseTimestamp = Date.now();

        postsData.forEach((post, index) => {
            const newId = maxId + index + 1;
            const newTimestamp = baseTimestamp - (index * 3600000); // 1 hour intervals

            newPosts.push({
                id: newId,
                title: post.title,
                content: post.content,
                timestamp: newTimestamp,
                postType: 'board',
                author: post.author,
                email: post.email,
                views: Math.floor(Math.random() * 80) + 20, // 20~100 random views
                likes: 0,
                dislikes: 0,
                comments: []
            });
        });

        // 1. Insert to Live MongoDB Collection
        console.log(`🚀 Inserting 10 stock analysis posts into MongoDB...`);
        const inserted = await Post.insertMany(newPosts);
        console.log(`✅ Successfully inserted ${inserted.length} posts into Live MongoDB!`);

        // 2. Synchronize to database.json backup file
        console.log(`🔄 Syncing backup database.json file...`);
        let rawJson = fs.readFileSync('./database.json', 'utf8');
        if (rawJson.charCodeAt(0) === 0xFEFF) rawJson = rawJson.slice(1);
        const dbData = JSON.parse(rawJson);

        if (!dbData.boardData) {
            dbData.boardData = [];
        }

        // Add the new posts to local boardData array
        newPosts.forEach(post => {
            // Check for duplicate in database.json just in case
            if (!dbData.boardData.some(b => b.id === post.id)) {
                dbData.boardData.push({
                    id: post.id,
                    title: post.title,
                    content: post.content,
                    author: post.author,
                    timestamp: post.timestamp
                });
            }
        });

        // Write the updated file back with beautiful formatting
        fs.writeFileSync('./database.json', JSON.stringify(dbData, null, 2), 'utf8');
        console.log(`✅ Successfully updated database.json with ${newPosts.length} new board posts!`);

        await mongoose.disconnect();
        console.log('🔌 Disconnected from MongoDB cleanly. Seeding process complete!');
        process.exit(0);
    } catch (err) {
        console.error('❌ SEEDING FAILED:', err);
        process.exit(1);
    }
}

seed();
