# 로컬 로그인 보안

OAuth에서는 네이버가 비밀번호 검증을 맡습니다. 로컬 로그인에서는 우리 서버가 비밀번호 저장, 반복 추측 방지, 세션 발급과 폐기를 모두 책임집니다. 비밀번호는 복호화 가능한 암호문이 아닌 **느린 단방향 해시**로 저장하며, 로그인할 때 입력값과 저장된 해시가 일치하는지 확인합니다.

## 적용한 보호 장치

| 영역 | 동작 |
| --- | --- |
| 비밀번호 저장 | Argon2id, 메모리 19 MiB, 반복 2회, 병렬도 1, 매번 무작위 16바이트 salt. 같은 비밀번호도 다른 해시로 저장됩니다. |
| 기존 계정 | bcrypt는 로그인 검증만 지원하며, 비밀번호가 맞으면 Argon2id로 전환합니다. 평문 저장값은 인정하지 않습니다. |
| 새 비밀번호 | 15~128 Unicode 코드 포인트. 공백·한글·이모지 허용, 붙여넣기 허용, 임의의 대문자/특수문자 조합 강제 없음. 잘못된 Unicode, 공백만 있는 값, 반복 단일 문자와 흔한 비밀번호 목록은 거부합니다. 기존 계정 로그인에 최소 15자 정책을 소급하지 않습니다. |
| 로그인 실패 | 없는 계정·비밀번호 불일치·소셜 계정으로 로컬 로그인 모두 동일한 401 응답. 없는 계정도 더미 해시를 계산합니다. |
| 반복 시도 | 15분 동안 계정별 최대 5회 예약, IP별 최대 60회. 성공하면 계정 카운터만 초기화합니다. 한도 초과 시 429 + Retry-After. 서로 다른 이메일을 대입해도 IP 한도를 공유합니다. OAuth는 IP 한도만 공유합니다. |
| 자원 보호 | 동시 해시 계산 최대 4개. 가입 요청은 IP별 15분에 10회. 카운터를 SQLite에 저장하므로 재시작으로 제한을 초기화할 수 없습니다. |
| 쿠키 | WCA_ACCESS는 HttpOnly·Secure·SameSite=None, host-only, Path=/. JWT를 localStorage에 넣지 않습니다. 기존 프런트/백엔드의 서로 다른 사이트 배치를 지원하기 위해 None을 유지하고 별도 CSRF 검증을 사용합니다. |
| 세션 | JWT 서명·issuer·만료·계정 인증 버전과 DB 등록 상태를 모두 확인합니다. 최대 12시간, 마지막 인증 사용 후 30분이 지나면 서버에서 만료합니다. DB에는 JWT 자체가 아닌 SHA-256 식별 해시만 저장합니다. |
| 로그아웃 | DB 세션을 삭제하고 쿠키를 만료합니다. 복사해 둔 JWT도 다시 사용할 수 없습니다. 서버 요청에 실패하면 화면에 재시도를 제공하며, 성공한 척 로그인 상태만 지우지 않습니다. |
| 비밀번호 변경 | 현재 비밀번호를 다시 검증하고 모든 기기의 세션을 폐기합니다. 계정 인증 버전도 바꿔 변경 전 비밀번호로 진행 중이던 로그인에서 뒤늦게 생성된 토큰을 거부합니다. |
| 요청 위조 | 인증된 요청은 기존 JWT에 연결된 X-CSRF-Token을 검사합니다. 로그아웃은 세션·CSRF 캐시가 만료되어도 안전하게 처리할 수 있도록 Origin과 전용 헤더로 보호합니다. 로그인·가입·비밀번호 변경은 JSON과 X-Requested-With: WeeklyComma를 요구하고 Origin을 허용 목록과 정확히 비교합니다. 일반 HTML 폼이나 다른 사이트의 스크립트로 로그인시킬 수 없게 합니다. |
| 화면 | 입력 중/단순 포커스에는 오류를 띄우지 않습니다. 제출 후 오류를 표시하며, 제한에 걸리면 서버가 알려준 대기 시간을 보여줍니다. |

계정 한도는 공격자가 타인의 계정을 일시적으로 제한할 수도 있는 절충안입니다. 영구 잠금 대신 짧은 기간을 사용하며, 실제 사용자 규모와 공격 패턴을 관찰해 조정해야 합니다. 프런트에서 버튼을 비활성화하는 것은 안내용이고, 제한은 서버가 강제합니다.

공개 SecLists 10,001개 목록과 소수의 추가 패턴을 서버 리소스에 포함했습니다. 출처·고정 리비전·체크섬·MIT 라이선스는 `backend/src/main/resources/security/`에 있습니다. 사용자 비밀번호를 외부로 전송하지 않으며, 이 목록이 모든 유출 비밀번호를 포괄하지는 않습니다.

## API

- `POST /authsessions`: 기존 LOCAL/OAUTH_NAVER 로그인. 성공하면 세션 쿠키와 화면용 사용자 정보·CSRF 토큰을 반환합니다.
- `GET /authsessions/me`: 세션 확인. 쿠키와 `X-CSRF-Token` 필요.
- `DELETE /authsessions`: 현재 세션 폐기. `X-Requested-With: WeeklyComma`와 허용된 요청 출처 필요. 쿠키가 없거나 만료된 상태에서도 200으로 응답하며 남아 있는 쿠키를 만료합니다.
- `PUT /authsessions/password`: `{ "currentPassword": "…", "newPassword": "…" }`. 쿠키·CSRF 토큰·JSON·`X-Requested-With: WeeklyComma` 필요. 성공 후 다시 로그인해야 합니다. 화면은 아직 연결하지 않았습니다.

인증 응답은 `Cache-Control: no-store`입니다. CORS에서 `Retry-After`를 노출하므로 프런트가 제한 시간을 읽을 수 있습니다.

## 회원가입·비밀번호 찾기는 다음 단계

이메일 소유 확인이 없는 공개 로컬 가입은 기본적으로 **비활성화**했습니다. `POST /users`의 LOCAL 요청은 404를 반환하며, 기존 네이버 가입은 유지합니다. 테스트용 격리 서버에서만 `SECURITY_LOCAL_SIGNUP_ENABLED=true`로 켤 수 있습니다. 기존/신뢰된 절차로 생성된 로컬 계정의 로그인은 이 설정과 관계없이 작동합니다. 화면의 회원가입·비밀번호 찾기 버튼은 기존처럼 비활성 상태입니다.

공개 로컬 가입을 열 때는 이메일 인증, 중복 가입의 일반화된 응답, 인증 메일 발송 제한을 함께 구현해야 합니다. 비밀번호 찾기는 충분히 무작위인 일회용 토큰을 해시로 저장하고 짧게 만료시키며, 재설정 후 모든 세션을 폐기해야 합니다. 이메일로 비밀번호 자체를 보내면 안 됩니다. MFA와 전체 유출 비밀번호 대조는 이번 작업에 포함하지 않았습니다.

## 배포·운영 설정

1. **운영에서는 프런트와 API 모두 HTTPS**를 사용합니다. Secure 쿠키를 해제해 우회하지 않습니다. TLS 종료 프록시의 HSTS도 배포 환경에서 설정합니다.
2. `JWT_TOKEN_SECRET`는 별도 비밀 저장소/환경 변수에 보관하는 무작위 값(최소 32바이트)이어야 합니다. 저장소·로그에 넣지 않습니다. 유출 시 교체하고 모든 사용자가 다시 로그인하게 합니다.
3. `SECURITY_ALLOWED_ORIGINS`는 쉼표로 구분한 정확한 프런트 origin 목록입니다. 기본값은 `http://localhost:5173,https://www.weeklycomma.kro.kr`입니다. 운영에서는 localhost를 제외하고 실제 서비스 origin만 지정합니다. 와일드카드는 허용하지 않습니다.
4. IP 제한은 **서블릿의 remoteAddr**를 사용합니다. 원시 `X-Forwarded-For`를 믿지 않습니다. 리버스 프록시 뒤에서는 서버의 신뢰할 프록시 목록과 직접 접속 차단을 배포 환경에 맞게 설정해야 합니다. 그렇지 않으면 여러 사용자가 프록시 IP 하나의 한도를 공유할 수 있습니다.
5. 이번 변경은 `login_session`, `login_throttle`, 사용자 `authVersion` 컬럼을 추가합니다. DB를 백업한 뒤 반영합니다. 기존 JWT는 등록된 서버 세션이 없어 한 번 다시 로그인해야 합니다. 새 세션은 서버 재시작 후에도 유지됩니다.
6. SQLite는 한 연결로 쓰기를 직렬화합니다. 다중 서버나 사용자 증가 시 세션·로그인 제한 저장소를 공유 DB/Redis로 옮기는 것이 적합합니다. 로그인 실패율·429·서버 오류를 관찰하되 비밀번호·JWT·CSRF 토큰·OAuth 코드는 기록하지 않습니다.

## 확인 방법

- 백엔드: `cd backend && ./gradlew test bootJar`
- 프런트: `cd frontend && npm run build && npm run lint && node --test tests/loginFlow.test.ts`
- 인증 테스트는 임시 SQLite에서 비밀번호 해시·Unicode·bcrypt 전환·동시 요청 제한·영속 카운터·만료·로그아웃 재사용·비밀번호 변경 경합을 검증합니다.
- HTTP 검증에서는 실제 서버의 쿠키/CSRF, 로그인 요청 출처, 429와 Retry-After, 비밀번호 변경과 로그아웃 후 토큰 거부를 확인합니다. 브라우저용 HTTP 프록시의 쿠키 속성 변경은 격리 테스트에서만 사용하며 프로젝트 설정에는 반영하지 않습니다.

## 근거

- [OWASP Password Storage](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)
- [OWASP Authentication](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [OWASP Session Management](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)
- [OWASP CSRF Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)
- [Spring Security Password Storage](https://docs.spring.io/spring-security/reference/features/authentication/password-storage.html)
