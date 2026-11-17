# HƯỚNG DẪN VẤN ĐÁP BẢO VỆ BÀI TẬP (ORAL DEFENSE PREPARATION GUIDE)
**Môn học**: Software Testing & Quality Assurance (HCMUS)  
**Bài tập**: HW05 – Performance Testing (HW05-AI)  
**Sinh viên thực hiện**: Lê Trung Thành Đạt  
**Mã số sinh viên (MSSV)**: `23120228`  
**Thời lượng vấn đáp**: 5 – 7 phút  

---

## 1. TỔNG QUAN CHIẾN LƯỢC TRẢ LỜI VẤN ĐÁP (5 PHÚT)
Khi thầy cô hoặc TA hỏi, hãy trả lời theo cấu trúc **STAR (Situation - Task - Action - Result)** hoặc **Vấn đề - Giải pháp kỹ thuật - Số liệu minh chứng cụ thể**:
1. **Nắm chắc số liệu**: Thuộc lòng p95, RPS, số requests, tỷ lệ lỗi của từng scenario.
2. **Nắm bản chất kỹ thuật**: Hiểu sâu cơ chế của k6 (`SharedArray`, `iterationInTest`, Go runtime) và kiến trúc backend (Node.js/Express + SQLite lock contention).
3. **Thái độ tự tin, trung thực**: Nhấn mạnh vai trò Human Review trong quy trình AI-First (phát hiện ra bug SUT, sửa code threshold cho HTTP 401/403).

---

## 2. BỘ CÂU HỎI & CÂU TRẢ LỜI CỐT LÕI (CORE DEFENSE Q&A)

### Câu 1: Tại sao em chọn Grafana k6 thay vì Apache JMeter hay Locust?
- **Trả lời ngắn gọn**:
  > *"Em chọn k6 vì 3 lý do kỹ thuật vượt trội:
  > 1. **Hiệu năng & Memory Footprint**: k6 viết bằng Go, biên dịch mã máy trực tiếp, sử dụng goroutines siêu nhẹ. Nó tiêu thụ RAM ít hơn JMeter (Java JVM threads nặng hàng chục MB/thread) tới 80%, giúp em chạy 100 VUs và test Endurance 12,600+ requests trên máy cá nhân mà không bị bottleneck phía client.
  > 2. **Kiến trúc Test-as-Code**: Toàn bộ kịch bản viết bằng JavaScript/ES6 chuẩn hóa, dễ dàng tích hợp Git version control, phân nhánh và CI/CD GitHub Actions hơn giao diện XML cồng kềnh của JMeter.
  > 3. **Native Thresholds & Metrics**: k6 cho phép định nghĩa pass/fail criteria toán học (`p(95)<50ms`, `rate<0.01`) ngay trong mã nguồn, tự động trả về exit code non-zero khi fail để chặn pipeline triển khai."*

---

### Câu 2: Em hãy giải thích cơ chế của `SharedArray` trong k6 và tại sao nó tối ưu bộ nhớ?
- **Trả lời**:
  > *"Trong kiến trúc của k6, mỗi Virtual User (VU) chạy trong một JavaScript VM (V8 isolate/goja runtime) hoàn toàn độc lập để đảm bảo tính cô lập luồng.
  > - Nếu dùng mảng JavaScript thông thường (`JSON.parse` hoặc mảng toàn cục), dữ liệu CSV sẽ bị nhân bản (deep copy) vào từng runtime của 100 VUs. Với dataset lớn, RAM máy client sẽ tăng vọt theo số VUs ($O(N \times VUs)$).
  > - `SharedArray` lưu trữ mảng dữ liệu vào **vùng nhớ dùng chung ở tầng Go runtime** (Read-Only Zero-Copy). Cả 100 VUs chỉ đọc con trỏ tham chiếu đến cùng một khối bộ nhớ duy nhất, giữ mức sử dụng RAM cố định và tối ưu bộ nhớ cache CPU."*

---

### Câu 3: Tại sao em dùng `exec.scenario.iterationInTest` thay vì `__VU` hay biến đếm thông thường để đọc dữ liệu CSV?
- **Trả lời**:
  > *"Trong k6, các VU thực thi bất đồng bộ song song.
  > - Nếu dùng `__VU`, các vòng lặp tiếp theo của cùng một VU sẽ lặp lại cùng một dòng dữ liệu, không dàn đều được dataset.
  > - Nếu dùng biến đếm toàn cục `counter++` trong JavaScript, do các VU chạy trên các VM độc lập, chúng không thể chia sẻ biến đếm qua lại nếu không có cơ chế atomic locking phức tạp.
  > - `exec.scenario.iterationInTest` cung cấp **bộ đếm tăng dần đơn điệu toàn cục (monotonic global counter)** từ $0 \rightarrow N-1$ cho toàn bộ scenario, bất kể VU nào thực thi. Em kết hợp toán tử modulo (`iterationInTest % profiles.length`) để phân phối dữ liệu Data-Driven theo cơ chế Round-Robin 100% đồng đều và không xung đột giữa các luồng."*

---

### Câu 4: Trong bài test có bước kiểm tra Lockout gửi password sai (HTTP 401/403). Tại sao ban đầu k6 báo fail Threshold, và em đã xử lý thế nào?
- **Trả lời**:
  > *"Mặc định trong k6, bất kỳ phản hồi HTTP nào có mã status $\ge 400$ đều bị metric tích hợp `http_req_failed` tính là request lỗi. Trong kịch bản Security/Negative Testing của em có bước cố tình gửi password sai để kiểm tra cơ chế khóa tài khoản, server trả về 401 hoặc 403 đúng như thiết kế, nhưng k6 lại tính là fail khiến tỷ lệ lỗi vọt lên 6.26%, vi phạm threshold `http_req_failed < 1%`.
  > - **Giải pháp của em**: Em cấu hình `responseCallback: http.expectedStatuses(401, 403)` trực tiếp trong tham số request k6. Nhờ đó k6 hiểu 401/403 là kết quả mong đợi hợp lệ cho bước kiểm thử này, giúp tỷ lệ `http_req_failed` phản ánh chính xác 0.00% lỗi hệ thống."*

---

### Câu 5: Em phát hiện bug gì trong mã nguồn backend SUT (`server.js`)?
- **Trả lời**:
  > *"Em phát hiện **BUG-01: Sai lệch logic đếm số lần đăng nhập thất bại** tại dòng 54 file `backend/server.js`:
  > - **Mã nguồn hiện tại**: `user.login_attempts + 2` thay vì `+ 1`.
  > - **Hậu quả**: Theo đặc tả FR-02, tài khoản chỉ bị khóa sau **3 lần** nhập sai liên tiếp. Nhưng do server cộng dồn bước nhảy là 2:
  >   - Lần 1 sai: `0 + 2 = 2` (chưa khóa, hợp lệ).
  >   - Lần 2 sai: `2 + 2 = 4 \ge 3` (bị khóa ngay lập tức ở lần thứ 2!).
  > - Như vậy người dùng bị khóa sớm hơn quy định 1 lần thử. Em đã lập Issue và đề xuất bản vá đổi thành `user.login_attempts + 1`."*

---

### Câu 6: Phân tích nguyên nhân suy giảm hiệu năng (Bottleneck) khi Stress Test lên 100 VUs?
- **Trả lời**:
  > *"Khi Stress Test từ 20 lên 50 và 100 VUs:
  > - Endpoint `GET /api/users/me` duy trì độ trễ cực nhanh (< 2ms) do chỉ đọc bộ nhớ.
  > - Endpoint `PUT /api/users/me` (cập nhật thông tin profile) ghi nhận độ trễ tăng vọt lên ~50ms khi đạt đỉnh 100 VUs.
  > - **Nguyên nhân cốt lõi**: Cơ sở dữ liệu SQLite mặc định sử dụng cơ chế **Rollback Journal Mode**. Khi có thao tác ghi (`PUT`), SQLite chiếm **Exclusive Table Lock**, khóa toàn bộ file cơ sở dữ liệu khiến tất cả các write transactions khác của các VUs phải xếp hàng chờ đợi (Lock Contention).
  > - **Đề xuất khắc phục**:
  >   1. Bật chế độ WAL (`PRAGMA journal_mode = WAL;`) cho phép nhiều luồng đọc và 1 luồng ghi chạy song song mà không khóa lẫn nhau.
  >   2. Thêm chỉ mục `CREATE INDEX idx_users_email ON users(email);` để tăng tốc độ lookup tài khoản từ $O(N)$ thành $O(\log N)$."*

---

### Câu 7: Kết quả Endurance Test cho thấy điều gì về rò rỉ bộ nhớ (Memory Leak)?
- **Trả lời**:
  > *"Endurance test được em chạy liên tục trong **11 phút 02 giây** với tải ổn định 25 VUs, thực hiện tổng cộng **12,602 requests** với thông lượng **19.02 req/s** và **0.00% lỗi**.
  > - Theo dõi tiến trình qua `process.memoryUsage().rss` và `htop`: Bộ nhớ RAM backend tăng nhẹ trong 2 phút đầu từ 82 MB lên 139 MB do cache V8 heap và database pool, sau đó hoàn toàn đi ngang (plateau) dao động quanh **141.9 MB** đến hết test.
  > - Không xuất hiện hiện tượng tăng đơn điệu không giới hạn (Monotonic Growth). Garbage Collector của Node.js giải phóng các object request đúng chu kỳ. Kết luận: Hệ thống **Zero Memory Leak** dưới tải 25 VUs liên tục."*

---

### Câu 8: Đề xuất Continuous Performance Testing của em hoạt động thế nào trong CI/CD?
- **Trả lời**:
  > *"Em xây dựng workflow GitHub Actions tự động kích hoạt trên mỗi Pull Request vào nhánh `main`:
  > 1. Tự động dựng môi trường test cô lập, seed dữ liệu sạch và khởi động backend Node.js.
  > 2. Chạy k6 headless với kịch bản Load Test chuẩn.
  > 3. Trích xuất p95 latency và so sánh với baseline của commit trước đó.
  > 4. **Tiêu chí chặn (Quality Gate)**:
  >    - Nếu `p95(current) > 1.20 * p95(baseline)` (tăng trên 20%), hoặc
  >    - Nếu `error_rate > 1.0%`:
  >    $\rightarrow$ Build bị đánh trượt (FAIL), chặn merge PR và cảnh báo trực tiếp về nhóm phát triển để ngăn ngừa performance regression vào production."*

---

## 3. TÓM TẮT THÔNG SỐ VÀNG (CHEAT SHEET SỐ LIỆU ĐỂ ĐỌC NHANH)

| Kịch bản | Số VUs | Thời gian | Tổng Requests | Throughput | p95 Latency | Tỷ lệ lỗi | Kết luận |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| **Load Test** | 15 VUs | 1m 35s | 957 | 9.78 req/s | 12.33 ms | 0.00% | Đạt SLA tuyệt đối |
| **Stress Test** | 20 $\rightarrow$ 100 VUs | 1m 55s | 5,124 | 43.23 req/s | 7.58 ms | 0.00% | Chịu tải tốt 100 VUs, lộ bottleneck ghi SQLite |
| **Spike Test** | 5 $\rightarrow$ 80 VUs | 1m 15s | 2,210 | 29.18 req/s | 6.60 ms | 4.43% | Tải tăng gấp 16 lần trong 10s; tự phục hồi ngay sau spike |
| **Endurance Test** | 25 VUs | 11m 02s | 12,602 | 19.02 req/s | 11.28 ms | 0.00% | RAM ổn định 141.9 MB, Zero Memory Leak |

---
*Tài liệu chuẩn bị bảo vệ vấn đáp độc quyền của sinh viên Lê Trung Thành Đạt (MSSV: 23120228).*
