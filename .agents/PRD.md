# PRD — Unified PDF Workspace

**Phiên bản:** 2.0
**Loại sản phẩm:** Web Application
**Tên dự án tạm thời:** DocFlow
**Định hướng:** All-in-one PDF, Document & Image Toolkit
**Tham khảo:** Smallpdf, iLovePDF
**Đối tượng triển khai:** AI Coding Agent

---

# 1. Tổng quan sản phẩm

## 1.1. Tầm nhìn

Xây dựng một nền tảng trực tuyến cho phép người dùng quản lý, chỉnh sửa, chia tách, ghép, chuyển đổi, nén và ký tài liệu trong một workspace thống nhất.

Sản phẩm lấy cảm hứng từ Smallpdf nhưng tập trung vào ba điểm khác biệt:

1. **Unified Workspace:** mọi thao tác xử lý tài liệu sử dụng chung một giao diện preview và quản lý trang.
2. **Workflow Chaining:** có thể chuyển tài liệu từ công cụ này sang công cụ khác mà không cần tải lên lại.
3. **Advanced Page Management:** hỗ trợ kéo thả, phân nhóm trang và tạo nhiều PDF đầu ra theo cách tùy chỉnh.

## 1.2. Vấn đề cần giải quyết

* Phải sử dụng nhiều website để hoàn thành một quy trình xử lý tài liệu.
* Khó xem trước và sắp xếp trang PDF.
* Công cụ Split PDF thường chưa linh hoạt khi cần tạo nhiều PDF từ các nhóm trang không liên tiếp.
* Chuyển đổi tài liệu có thể làm thay đổi bố cục, công thức và bảng biểu.
* Phải tải xuống rồi tải lên lại khi muốn thực hiện nhiều thao tác liên tiếp.
* Khó kiểm soát tên tệp, thứ tự trang và kết quả đầu ra.
* Một số công cụ không minh bạch về cách lưu trữ và xử lý tài liệu.

## 1.3. Đối tượng người dùng

* Sinh viên, giảng viên và người làm nghiên cứu.
* Nhân viên văn phòng.
* Người thường xuyên làm việc với PDF, Word và hình ảnh.
* Người viết tài liệu kỹ thuật bằng LaTeX.
* Người cần ký, chia sẻ hoặc tối ưu tài liệu.

## 1.4. Nguyên tắc sản phẩm

* Một lần tải tệp, nhiều thao tác liên tiếp.
* Preview trước khi xuất.
* Không ghi đè tài liệu gốc.
* Kéo thả là phương thức tương tác chính cho quản lý trang.
* Giao diện đơn giản ở các tác vụ cơ bản, có tùy chọn nâng cao khi cần.
* Ưu tiên xử lý cục bộ khi khả thi.
* Không hiển thị tính năng chưa được triển khai như thể đã hoạt động.
* Tính đúng đắn của tệp đầu ra quan trọng hơn hiệu ứng giao diện.

---

# 2. Phạm vi tính năng

## 2.1. Organize PDF

| Công cụ            | Chức năng                                         |
| ------------------ | ------------------------------------------------- |
| Merge PDF          | Ghép nhiều PDF thành một                          |
| Split PDF          | Chia một PDF thành một hoặc nhiều PDF             |
| Extract Pages      | Trích xuất trang được chọn                        |
| Reorder PDF        | Sắp xếp lại thứ tự trang                          |
| Delete Pages       | Xóa trang                                         |
| Rotate PDF         | Xoay từng trang hoặc nhóm trang                   |
| Duplicate Pages    | Nhân bản trang                                    |
| Insert Pages       | Chèn trang từ PDF khác                            |
| Crop PDF           | Cắt vùng hiển thị của trang                       |
| Resize Pages       | Thay đổi kích thước trang                         |
| Page Numbers       | Đánh số trang                                     |
| Remove Blank Pages | Phát hiện và xóa trang trắng, có preview xác nhận |

## 2.2. Convert Documents

| Công cụ         | Định dạng đầu ra                           |
| --------------- | ------------------------------------------ |
| PDF to Word     | DOCX                                       |
| PDF to Image    | JPG, PNG, WebP                             |
| PDF to Text     | TXT                                        |
| PDF to Markdown | MD                                         |
| PDF to HTML     | HTML                                       |
| Word to PDF     | PDF                                        |
| Image to PDF    | PDF                                        |
| Text to PDF     | PDF                                        |
| Markdown to PDF | PDF                                        |
| HTML to PDF     | PDF                                        |
| LaTeX to PDF    | PDF                                        |
| LaTeX to Word   | DOCX                                       |
| PDF OCR         | PDF có lớp văn bản nhận dạng               |
| PDF to PDF/A    | PDF/A trong phạm vi tiêu chuẩn được hỗ trợ |

Chất lượng chuyển đổi phải được kiểm tra thực tế. Đặc biệt, PDF to Word và LaTeX to Word không được cam kết bảo toàn hoàn hảo mọi bố cục, công thức hoặc bảng.

## 2.3. Edit PDF

* Add Text.
* Add Image hoặc logo.
* Highlight.
* Draw.
* Shapes: đường, hình chữ nhật, mũi tên.
* Watermark.
* Sign PDF.
* Fill PDF Forms.
* Flatten PDF.
* Redact PDF: loại bỏ nội dung nhạy cảm thực sự khỏi tệp đầu ra.

MVP tập trung vào annotation và thêm nội dung. Chỉnh sửa trực tiếp văn bản gốc là tính năng nâng cao.

## 2.4. Compress & Protect

**Compress PDF**

* Low compression: ưu tiên chất lượng.
* Balanced compression: cân bằng chất lượng và dung lượng.
* High compression: ưu tiên dung lượng nhỏ.
* Hiển thị dung lượng trước/sau và phần trăm thay đổi.
* Không ghi đè bản gốc.

**Protect PDF**

* Đặt mật khẩu mở PDF.
* Mở khóa PDF khi có thông tin xác thực phù hợp.
* Flatten annotation và form.
* Xóa metadata tùy chọn.
* Cảnh báo trước khi xuất nếu tài liệu có thể chứa thông tin nhạy cảm.

**Sign PDF**

* Vẽ chữ ký.
* Nhập chữ ký từ văn bản.
* Tải ảnh chữ ký lên.
* Kéo thả, đổi kích thước và vị trí chữ ký.
* Chọn trang cần ký.
* Thêm ngày và tên người ký.
* Preview trước khi xuất.

Chữ ký hiển thị không mặc nhiên là chữ ký số dựa trên chứng thư số. Không quảng cáo các bảo đảm pháp lý hoặc mật mã chưa được triển khai.

---

# 3. Kiến trúc trải nghiệm — Unified Document Workspace

Đây là thành phần trung tâm của toàn bộ sản phẩm.

## 3.1. Bố cục giao diện desktop

* **Top bar:** tên tài liệu, trạng thái, Undo, Redo, Export.
* **Left sidebar:** thumbnail các trang hoặc danh sách tài liệu nguồn.
* **Main canvas:** preview trang đang chọn.
* **Right panel:** tùy chọn của công cụ hiện tại.
* **Bottom toolbar:** zoom, số trang, tổng số trang, chế độ hiển thị.

Giao diện phải tận dụng tốt không gian màn hình, tránh các card lồng nhau quá nhiều hoặc thanh điều khiển chiếm diện tích preview.

## 3.2. Giao diện mobile

* Sidebar chuyển thành drawer hoặc bottom sheet.
* Các nút thao tác chính phải dễ chạm.
* Hỗ trợ chọn nhiều trang và kéo thả bằng cảm ứng.
* Bảng cài đặt được thu gọn khi không sử dụng.
* Cho phép thay thế thao tác kéo thả bằng nút Move Up/Move Down khi cần.
* Giữ trạng thái lựa chọn khi người dùng mở và đóng panel.

## 3.3. PDF preview

Bắt buộc hỗ trợ:

* Thumbnail toàn bộ trang.
* Render trang chính với chất lượng phù hợp.
* Zoom in/out.
* Fit Page và Fit Width.
* Điều hướng trang.
* Chọn một hoặc nhiều trang.
* Xoay trang và cập nhật preview.
* Hiển thị số trang gốc và số thứ tự hiện tại.
* Lazy rendering cho tài liệu nhiều trang.
* Loading, error và password-required states.
* Preview các trang trước khi xuất kết quả.

Không render đồng thời toàn bộ tài liệu ở độ phân giải cao nếu gây tiêu thụ bộ nhớ quá lớn.

## 3.4. Drag-and-drop

Người dùng có thể:

* Kéo một trang đến vị trí mới.
* Di chuyển nhiều trang đã chọn.
* Kéo trang từ PDF nguồn khác vào tài liệu đích.
* Kéo trang giữa các nhóm PDF trong Custom Split.
* Sắp xếp lại các tệp trong Merge PDF.
* Sắp xếp thứ tự PDF đầu ra trước khi đóng gói ZIP.

Yêu cầu UX:

* Có drop indicator rõ ràng.
* Animation ngắn, không gây giật.
* Không mất lựa chọn khi kéo trang.
* Không nhầm trang nguồn với thứ tự trang hiện tại.
* Có thao tác thay thế bằng menu hoặc bàn phím.

## 3.5. Data model của trang

Mỗi trang cần có định danh ổn định, không phụ thuộc vào số trang đang hiển thị.

Các trường gợi ý:

* `pageId`
* `sourceDocumentId`
* `sourcePageIndex`
* `currentIndex`
* `rotation`
* `cropBox`

Thứ tự hiển thị và dữ liệu nguồn phải được tách biệt. Di chuyển một trang không được làm thay đổi sai nội dung nguồn.

---

# 4. Split PDF — Hệ thống chia PDF nâng cao

Split PDF có **hai chế độ chính**:

1. **One PDF:** tất cả trang được chọn hoặc các khoảng trang được chọn sẽ trở thành một PDF duy nhất.
2. **Multiple PDFs:** các trang được phân thành nhiều PDF riêng biệt; hệ thống đóng gói thành một ZIP để tải xuống.

Trong Multiple PDFs có hai phương thức: Auto Split và Custom Split.

## 4.1. Màn hình lựa chọn chế độ

Sau khi tải PDF lên, hiển thị hai lựa chọn lớn:

**One PDF**

Gom các trang được chọn thành một PDF duy nhất.

**Multiple PDFs**

Tạo nhiều PDF riêng biệt, sau đó tải xuống dưới dạng ZIP.

Không đặt tất cả tùy chọn nâng cao lên màn hình đầu tiên. Chỉ hiển thị tùy chọn tương ứng sau khi người dùng chọn chế độ.

## 4.2. Mode 1 — One PDF

Mục tiêu: tạo một PDF chứa tất cả trang được chọn.

### Cách chọn trang

* Chọn trực tiếp bằng thumbnail.
* Chọn nhiều trang không liên tiếp.
* Nhập các khoảng trang.
* Kết hợp chọn bằng thumbnail và nhập khoảng.
* Sắp xếp lại trang bằng kéo thả.

Ví dụ nhập:

`1-3, 5-7, 9-13`

Kết quả là một PDF gồm 11 trang.

### Yêu cầu

* Hiển thị tổng số trang được chọn.
* Preview thứ tự trang đầu ra.
* Cho phép thay đổi thứ tự trước khi xuất.
* Cho phép đặt tên PDF.
* Không đưa trang không được chọn vào kết quả.
* Không xuất nếu chưa có trang nào được chọn.

### Quy tắc nhập khoảng

* Hỗ trợ `1-3, 5, 7-9`.
* Số trang bắt đầu từ 1.
* Kiểm tra trang vượt quá tổng số trang.
* Phát hiện khoảng đảo ngược.
* Cảnh báo khoảng trùng lặp ngoài ý muốn.
* Có thể chuẩn hóa khoảng hợp lệ trước khi tạo PDF.

## 4.3. Mode 2 — Multiple PDFs

Mục tiêu: tạo nhiều PDF độc lập từ một PDF nguồn.

Sau khi chia, người dùng có thể tải riêng từng PDF hoặc tải tất cả qua một file ZIP.

### 4.3.1. Auto Split — Chia tự động

Cung cấp ba cách chia.

**A. Split by Page Ranges**

Người dùng nhập:

`1-3, 5-7, 9-13`

Hệ thống tạo:

* `document_part_01.pdf`: trang 1–3.
* `document_part_02.pdf`: trang 5–7.
* `document_part_03.pdf`: trang 9–13.

Mỗi khoảng hợp lệ tạo một PDF riêng.

**B. Split Every N Pages**

Người dùng chọn số trang mỗi PDF.

Ví dụ: PDF có 20 trang, mỗi tệp 4 trang.

* PDF 1: trang 1–4.
* PDF 2: trang 5–8.
* PDF 3: trang 9–12.
* PDF 4: trang 13–16.
* PDF 5: trang 17–20.

Nhóm cuối có thể ít hơn N trang nếu tổng số trang không chia hết cho N.

**C. Split at Selected Pages**

Người dùng chọn các điểm ngắt giữa các đoạn.

Ví dụ chọn ngắt sau trang 3 và trang 7:

* PDF 1: trang 1–3.
* PDF 2: trang 4–7.
* PDF 3: trang 8 đến hết.

Giao diện phải phân biệt rõ điểm ngắt với trang được chọn để trích xuất.

## 4.4. Custom Split — Tự chia nhóm PDF

Đây là tính năng nâng cao quan trọng nhất của Split PDF.

Người dùng tự quyết định mỗi PDF đầu ra chứa những trang nào. Các trang không cần liên tiếp và có thể xuất hiện trong nhiều PDF khác nhau.

### Giao diện

**Available Pages**

Hiển thị toàn bộ trang nguồn dưới dạng thumbnail.

**Output PDFs**

Hiển thị các nhóm PDF đầu ra do người dùng tạo.

### Các thao tác

* Add PDF Group: tạo một nhóm PDF.
* Rename Group: đổi tên nhóm.
* Remove Group: xóa nhóm.
* Add Selected Pages: thêm trang đã chọn vào nhóm.
* Drag and Drop: kéo trang vào nhóm mong muốn.
* Reorder Pages: sắp xếp lại trang bên trong nhóm.
* Remove Page: loại trang khỏi nhóm mà không xóa trang nguồn.
* Duplicate Across Groups: cho phép sử dụng cùng một trang trong nhiều PDF.
* Preview Group: xem riêng từng PDF.
* Show Unassigned Pages: hiển thị trang chưa được gán.
* Select Multiple Pages: thêm nhiều trang cùng lúc.

### Ví dụ

PDF nguồn có 20 trang.

Người dùng tạo:

* **PDF 1:** trang 1, 2, 3, 5.
* **PDF 2:** trang 6–9 và 12–16.
* **PDF 3:** trang 4, 10, 11, 17–20.

Kết quả gồm 3 PDF riêng biệt và một file ZIP chứa cả ba tệp.

Thứ tự trong từng PDF tuân theo cấu hình của người dùng, không tự động sắp xếp lại nếu người dùng đã kéo thả.

### Quy tắc dữ liệu

* Các nhóm có thứ tự trang độc lập.
* Trang nguồn không bị xóa khi được thêm vào hoặc loại khỏi nhóm.
* Trang chưa gán không tự động xuất hiện trong đầu ra.
* Cảnh báo trước khi xuất nếu còn trang chưa gán.
* Cho phép xuất khi còn trang chưa gán nếu người dùng xác nhận.
* Mặc định không cho phép trùng cùng một trang trong một nhóm.
* Cho phép một trang xuất hiện trong nhiều nhóm khác nhau.
* Mỗi nhóm phải có tối thiểu một trang.

## 4.5. Output Overview

Trước khi xuất, hiển thị danh sách các PDF sẽ được tạo.

Mỗi hàng hoặc thẻ gồm:

* Tên tệp.
* Số trang.
* Thumbnail đại diện.
* Nút Preview.
* Nút Rename.
* Nút Remove.
* Vị trí trong ZIP.

Cho phép kéo thả để sắp xếp thứ tự các tệp đầu ra.

Cung cấp:

* Edit Groups.
* Preview All.
* Rename All theo mẫu.
* Export ZIP.
* Download Individual PDFs.

## 4.6. Export ZIP

Quy trình:

1. Xác thực tất cả nhóm.
2. Đặt tên các PDF đầu ra.
3. Đặt tên file ZIP.
4. Tạo từng PDF.
5. Kiểm tra kết quả tạo PDF.
6. Đóng gói thành ZIP.
7. Kiểm tra ZIP hoàn chỉnh.
8. Hiển thị trạng thái thành công.
9. Cho phép tải ZIP hoặc từng PDF riêng lẻ.

Ví dụ:

`split_documents.zip`

* `chapter_01.pdf`
* `chapter_02.pdf`
* `appendix.pdf`

Nếu một nhóm bị lỗi, hiển thị nhóm lỗi và cho phép thử lại. Không hiển thị thành công nếu ZIP chưa hoàn tất.

## 4.7. Tiếp tục xử lý sau Split

Sau khi tạo nhiều PDF:

* Người dùng có thể chọn một PDF để tiếp tục Compress.
* Người dùng có thể chọn một PDF để Sign.
* Người dùng có thể mở lại Custom Split để chỉnh sửa nhóm.
* Những PDF còn lại không bị thay đổi.
* Không yêu cầu upload lại tệp nguồn.

Mặc định không áp dụng Compress hoặc Sign đồng thời lên mọi PDF. Nếu muốn xử lý hàng loạt, người dùng phải chọn Batch Processing.

## 4.8. Acceptance Criteria cho Split

* Mode 1 với `1-3, 5-7, 9-13` tạo đúng một PDF có 11 trang.
* Mode 2 theo khoảng tạo đúng ba PDF với lần lượt 3, 3 và 5 trang.
* Split Every N Pages chia đúng nhóm và xử lý đúng nhóm cuối.
* Split at Selected Pages tạo đúng các đoạn liên tiếp.
* Custom Split xuất đúng các nhóm trang đã cấu hình.
* ZIP chứa đủ các PDF, đúng tên và không có tệp ngoài dự kiến.
* Các trang không được chọn không xuất hiện trong đầu ra.
* Lỗi ở một nhóm không làm mất dữ liệu nguồn.
* Preview và thứ tự trang phải khớp với PDF thực tế.

---

# 5. Merge PDF

## 5.1. Quy trình

1. Tải lên nhiều PDF.
2. Hiển thị danh sách tài liệu và số trang.
3. Sắp xếp thứ tự các tệp.
4. Mở rộng tài liệu để xem từng trang.
5. Kéo thả trang giữa các tài liệu.
6. Xoay, xóa hoặc nhân bản trang.
7. Preview kết quả.
8. Đặt tên tệp.
9. Merge và xuất PDF.

## 5.2. Tính năng

* Add Files.
* Remove File.
* Reorder Files.
* Reorder Pages.
* Move Pages Between Documents.
* Rotate Pages.
* Delete Pages.
* Duplicate Pages.
* Select Pages.
* Preview Merged PDF.
* Export PDF.

Không yêu cầu người dùng ghép tài liệu trước rồi mới được sắp xếp trang. Có thể thực hiện toàn bộ việc tổ chức trong một workspace.

---

# 6. Compress PDF

## 6.1. Chế độ nén

* Low: ưu tiên chất lượng.
* Balanced: cân bằng chất lượng và dung lượng.
* High: ưu tiên giảm dung lượng.

Mô tả rõ tác động dự kiến, không hứa hẹn tỷ lệ giảm dung lượng cố định.

## 6.2. Kết quả

Hiển thị:

* Dung lượng ban đầu.
* Dung lượng sau nén.
* Mức chênh lệch.
* Phần trăm giảm hoặc tăng dung lượng.
* Preview tài liệu.
* Nút Download.
* Nút Continue to Sign.
* Nút Continue to Protect.

Nếu tệp sau xử lý lớn hơn bản gốc, thông báo rõ và cho phép giữ bản gốc.

---

# 7. PDF to Word và chuyển đổi tài liệu

## 7.1. PDF to Word

* Xuất DOCX.
* Hỗ trợ văn bản, bảng và hình ảnh trong phạm vi engine.
* Hiển thị trạng thái chuyển đổi.
* Cho phép tải DOCX.
* Cung cấp tùy chọn OCR nếu PDF là bản scan.
* Thông báo khi bố cục phức tạp có thể thay đổi.
* Không tuyên bố chỉnh sửa DOCX trực tiếp trong PDF canvas nếu chưa có editor phù hợp.

## 7.2. PDF to Image

* JPG, PNG, WebP.
* Chọn tất cả trang hoặc một số trang.
* Chọn chất lượng hoặc độ phân giải khi định dạng hỗ trợ.
* Preview hình ảnh.
* Tải riêng từng ảnh hoặc tất cả ảnh dưới dạng ZIP.
* Đặt tên theo số trang, ví dụ `document_page_001.png`.

## 7.3. LaTeX Converter

### Editor

* Code editor có syntax highlighting.
* Compile.
* Preview PDF.
* Download PDF.
* Download source `.tex`.
* Compile lại sau khi sửa.
* Hiển thị lỗi biên dịch theo dòng.
* Có template mẫu: báo cáo, bài tập, luận văn, công thức toán.

### LaTeX to Word

* Chuyển đổi sang DOCX bằng pipeline tương thích.
* Giữ công thức ở mức engine hỗ trợ.
* Cảnh báo với package hoặc cấu trúc không được hỗ trợ.
* Không tuyên bố chuyển đổi hoàn hảo.
* Tách biệt lỗi biên dịch PDF với lỗi chuyển đổi DOCX.

Không thực thi mã nguồn tùy ý một cách không kiểm soát trên máy chủ. Nếu biên dịch ở backend, phải sử dụng môi trường sandbox phù hợp.

---

# 8. Edit PDF và Sign PDF

## 8.1. Edit PDF

* Add Text.
* Add Image.
* Highlight.
* Draw.
* Shapes.
* Watermark.
* Page Numbers.
* Fill PDF Forms.
* Flatten PDF.
* Redact PDF.

Mọi thao tác chỉnh sửa phải có preview và xuất thành phiên bản mới.

Redact PDF phải loại bỏ nội dung bị che khỏi dữ liệu đầu ra, không chỉ vẽ một hình chữ nhật lên trên.

## 8.2. Sign PDF

* Draw Signature.
* Type Signature.
* Upload Signature Image.
* Resize and Move.
* Select Page.
* Add Signer Name.
* Add Date.
* Preview.
* Apply Signature.
* Download Signed PDF.

Chữ ký hiển thị cần được phân biệt với chữ ký số có chứng thư.

Sau khi ký, người dùng có thể tiếp tục Compress hoặc Protect nếu phù hợp, nhưng phải cảnh báo rằng một số thao tác chỉnh sửa tiếp theo có thể ảnh hưởng đến cơ chế xác minh chữ ký số nếu tài liệu sử dụng chữ ký số thực sự.

---

# 9. Workflow Chaining — Chuyển tiếp giữa các công cụ

Đây là tính năng cốt lõi tạo khác biệt cho sản phẩm.

## 9.1. Ví dụ workflow

`Upload → Merge → Compress → Sign → Download`

`Upload → Split → Chọn PDF → Compress → Sign → Download`

`Upload → Extract Pages → Rotate → Page Numbers → Compress → Download`

`LaTeX → Compile PDF → Compress → Sign → Download`

`PDF → OCR → PDF to Word → Download DOCX`

## 9.2. Giao diện tiếp tục xử lý

Sau mỗi thao tác, hiển thị:

* Preview tài liệu hiện hành.
* Tên tài liệu.
* Số trang.
* Dung lượng nếu đã xác định.
* Download.
* Continue Editing.
* Next Step.

Gợi ý công cụ tiếp theo theo ngữ cảnh, nhưng không tự động chuyển đổi hoặc sửa tài liệu khi chưa có xác nhận.

## 9.3. Revision History

Mỗi lần xử lý thành công tạo một revision mới.

Ví dụ:

* Revision 1: tài liệu ban đầu.
* Revision 2: sau Merge.
* Revision 3: sau Compress.
* Revision 4: sau Sign.

Cho phép quay lại revision trước trong thời gian dữ liệu còn khả dụng.

Nếu một bước thất bại, giữ nguyên revision thành công gần nhất. Không được ghi đè hoặc làm hỏng tài liệu nguồn.

## 9.4. Định nghĩa trạng thái tài liệu

Mỗi tài liệu cần có:

* `documentId`
* `revisionId`
* `parentRevisionId`
* `sourceFormat`
* `currentFormat`
* `pageCount`
* `fileSize`
* `processingStatus`

Chỉ cho phép chuyển sang công cụ có đầu vào tương thích. Ví dụ, DOCX sau PDF to Word không được xử lý trực tiếp như PDF cho đến khi được chuyển đổi lại.

---

# 10. Hệ thống đặt tên tệp

## 10.1. Tên mặc định

* `document_merged.pdf`
* `document_extracted.pdf`
* `document_compressed.pdf`
* `document_signed.pdf`
* `document_converted.docx`
* `document_part_01.pdf`
* `document_page_001.png`

Tên mặc định được tạo từ tên nguồn và thao tác thực hiện.

## 10.2. Tùy chỉnh

* Đổi tên trước khi xuất.
* Đổi phần mở rộng theo định dạng đầu ra.
* Hỗ trợ Unicode và tiếng Việt.
* Loại bỏ ký tự không hợp lệ.
* Tránh ghi đè ngoài ý muốn.
* Đặt tên hàng loạt theo mẫu `{name}_part_{n}`.
* Đặt tên ZIP.
* Kiểm tra tên trùng lặp trong cùng gói ZIP.

Tên trong giao diện và tên tệp tải xuống phải đồng nhất.

---

# 11. Các công cụ mở rộng

## 11.1. PDF Toolkit

* Extract Images.
* PDF Metadata.
* OCR PDF.
* Search PDF.
* Compare PDF.
* Repair PDF trong phạm vi có thể khôi phục.
* PDF/A.
* Remove Blank Pages.
* Redact PDF.

## 11.2. Image Toolkit

* Image to PDF.
* PDF to Image.
* Compress Image.
* Resize Image.
* Crop Image.
* Rotate Image.
* JPG/PNG/WebP Converter.
* Merge Images into PDF.

## 11.3. Document Toolkit

* DOCX to PDF.
* PDF to DOCX.
* TXT to PDF.
* Markdown to PDF.
* HTML to PDF.
* LaTeX to PDF.
* LaTeX to DOCX.
* PDF to Text.
* PDF to Markdown.

## 11.4. Productivity

* Recent Files.
* Favorite Tools.
* Recent Workflows.
* Batch Processing.
* Workflow Presets.
* Keyboard Shortcuts.
* PWA.
* Autosave Settings.

Recent Files mặc định chỉ lưu trong phạm vi phiên hoặc trên thiết bị theo chính sách được công bố. Không mặc định tải và lưu toàn bộ nội dung tài liệu lên tài khoản người dùng.

## 11.5. AI PDF — giai đoạn sau

* Tóm tắt tài liệu.
* Hỏi đáp theo nội dung PDF.
* Dịch tài liệu.
* Trích xuất bảng.
* Tạo câu hỏi học tập.

Các tính năng AI phải thông báo rõ khi tài liệu được gửi tới dịch vụ bên ngoài và cần có cơ chế lựa chọn phù hợp về quyền riêng tư.

---

# 12. UX/UI Design System

## 12.1. Phong cách

Modern productivity SaaS, tối giản, chuyên nghiệp, tập trung vào công việc.

Đặc điểm:

* Nền trung tính sáng.
* Màu accent thống nhất.
* Border nhẹ và shadow vừa phải.
* Bo góc có hệ thống.
* Typography rõ ràng.
* Icon đồng bộ.
* Animation ngắn, có mục đích.
* Dark mode là tùy chọn phát triển sau.

Tránh gradient rực rỡ, glassmorphism quá mức, card lồng nhau và các hiệu ứng gây phân tán sự chú ý.

## 12.2. Trang chủ

Các thành phần:

1. Header: logo, Tools, Features, Settings.
2. Hero: thông điệp chính và vùng tải tệp.
3. Search Tools.
4. Popular Tools.
5. Categories: Organize, Convert, Edit, Protect, Image, LaTeX.
6. Recent Workflows nếu có.
7. Privacy Section.
8. Footer: thông tin, trợ giúp và chính sách.

## 12.3. Tool Discovery

* Tìm kiếm theo tên.
* Tìm theo mục đích.
* Nhóm công cụ theo danh mục.
* Mô tả ngắn cho mỗi công cụ.
* Điều hướng nhanh tới workspace.
* Dùng chung component và design token.

## 12.4. Trạng thái giao diện

Mọi công cụ cần xử lý:

* Empty.
* Dragging.
* Uploading.
* Processing.
* Success.
* Error.
* Unsupported File.
* Password Required.
* Canceled.
* Download Ready.

Thông báo lỗi cần dễ hiểu và có hành động tiếp theo.

---

# 13. Kiến trúc kỹ thuật

AI coding agent phải khảo sát repository hiện có trước khi quyết định thay đổi stack.

## 13.1. Frontend

Đề xuất mặc định:

* React + TypeScript.
* Next.js hoặc Vite tùy nhu cầu.
* Tailwind CSS.
* Component library nhất quán.
* PDF.js để render PDF.
* Thư viện drag-and-drop phù hợp với thao tác nhiều trang.
* State management phù hợp.
* Web Worker cho tác vụ client-side nặng.

Không bắt buộc thay stack nếu repository hiện tại đã có kiến trúc phù hợp.

## 13.2. PDF Processing

Có thể dùng pdf-lib hoặc thư viện tương đương cho các thao tác cấu trúc PDF phù hợp.

PDF.js dùng cho preview và đọc nội dung trong phạm vi hỗ trợ.

Các tính năng PDF to DOCX, OCR và LaTeX cần engine riêng nếu thư viện client-side không đáp ứng chất lượng.

Không giả định một thư viện có thể làm tốt mọi tác vụ.

## 13.3. Backend

Chỉ triển khai khi cần thiết cho:

* Biên dịch LaTeX.
* OCR.
* Chuyển đổi định dạng phức tạp.
* Xử lý tệp lớn.
* Các tác vụ vượt khả năng trình duyệt.

Nếu cần backend:

* Có giới hạn kích thước.
* Có kiểm tra định dạng.
* Có timeout và xử lý lỗi.
* Có cơ chế xóa tệp tạm.
* Có hàng đợi cho tác vụ dài khi cần.
* Có lớp adapter để thay thế dịch vụ xử lý.
* Không log nội dung tài liệu hoặc mật khẩu.

## 13.4. Tool Registry

Mỗi công cụ phải khai báo:

* Input types.
* Output types.
* Processing mode.
* Required capabilities.
* Settings schema.
* Validation.
* Processing function.
* Error handling.
* Export options.

Workflow engine sử dụng registry để kiểm tra tính tương thích giữa các bước.

---

# 14. Bảo mật và quyền riêng tư

* Ưu tiên xử lý cục bộ khi khả thi.
* Không tự động gửi tài liệu đến dịch vụ bên thứ ba mà không thông báo.
* Không ghi nội dung PDF hoặc mật khẩu vào log.
* Không công khai URL tài liệu theo mặc định.
* Kiểm tra MIME type và nội dung tệp.
* Giới hạn kích thước và thời gian xử lý.
* Xóa tệp tạm trên server theo chính sách rõ ràng.
* Cô lập phiên xử lý.
* Không lưu chữ ký thành tài sản dùng chung nếu chưa có sự đồng ý.
* Không giữ tài liệu trên máy chủ lâu hơn mức cần thiết.
* Có chính sách quyền riêng tư minh bạch.

Không tuyên bố “100% private” hoặc “100% secure” nếu kiến trúc thực tế chưa bảo đảm điều đó.

---

# 15. Hiệu năng và khả năng tương thích

## 15.1. Hiệu năng

* Lazy-load thumbnail.
* Virtualize danh sách trang khi cần.
* Không render tất cả trang ở độ phân giải cao cùng lúc.
* Đưa tác vụ nặng sang Worker hoặc background job phù hợp.
* Hiển thị tiến trình thực tế.
* Hủy tác vụ nếu có thể.
* Giải phóng bộ nhớ của tài nguyên không còn sử dụng.
* Không làm treo UI khi xử lý tệp lớn.

## 15.2. Trình duyệt

* Chrome.
* Edge.
* Firefox.
* Safari.
* Chrome trên Android.
* Safari trên iOS.

## 15.3. Accessibility

* Điều hướng bằng bàn phím.
* Focus state rõ ràng.
* Tooltip cho icon khó hiểu.
* Tương phản màu phù hợp.
* Drag-and-drop có phương án thay thế.
* Các nút có tên dễ hiểu và vùng chạm phù hợp.

---

# 16. Functional Requirements

| ID    | Yêu cầu                                            |
| ----- | -------------------------------------------------- |
| FR-01 | Upload một hoặc nhiều tệp theo yêu cầu công cụ     |
| FR-02 | Kiểm tra định dạng, dung lượng và khả năng đọc     |
| FR-03 | Preview PDF và thumbnail                           |
| FR-04 | Chọn, di chuyển, xoay và xóa trang                 |
| FR-05 | Merge PDF với quản lý thứ tự trang                 |
| FR-06 | Split PDF theo hai chế độ One PDF và Multiple PDFs |
| FR-07 | Custom Split cho phép tạo nhiều nhóm PDF           |
| FR-08 | Multiple PDFs có thể xuất thành ZIP                |
| FR-09 | Compress PDF với các mức chất lượng                |
| FR-10 | PDF to Word và PDF to Image                        |
| FR-11 | Sign PDF                                           |
| FR-12 | LaTeX to PDF và pipeline chuyển DOCX               |
| FR-13 | Đặt tên tệp đầu ra                                 |
| FR-14 | Chuyển tiếp giữa các công cụ                       |
| FR-15 | Revision history và Undo/Redo trong phạm vi hỗ trợ |
| FR-16 | Trạng thái loading, success và error               |
| FR-17 | Xử lý tài liệu lỗi và trường hợp vượt giới hạn     |
| FR-18 | Tải từng tệp hoặc gói ZIP                          |
| FR-19 | Bảo vệ dữ liệu nguồn và tệp tạm                    |
| FR-20 | Responsive và accessibility cơ bản                 |

---

# 17. Lộ trình triển khai

## P0 — MVP

* Trang chủ và Tool Discovery.
* Upload PDF.
* Unified Workspace.
* PDF preview và thumbnail.
* Reorder, Rotate, Delete Pages.
* Merge PDF.
* Split PDF: One PDF.
* Split PDF: Multiple PDFs — Auto Split.
* Split PDF: Custom Split.
* ZIP export.
* Compress PDF.
* PDF to Image.
* Sign PDF cơ bản.
* File Naming System.
* Workflow chaining.
* Undo/Redo cho các thao tác trang cơ bản.
* Loading, success và error states.
* Chính sách xử lý tệp.

## P1 — Mở rộng

* PDF to Word.
* LaTeX to PDF.
* LaTeX to DOCX.
* OCR.
* Page Numbers.
* Watermark.
* Protect PDF.
* Image to PDF.
* DOCX to PDF.
* Batch Processing.
* Workflow Presets.

## P2 — Nâng cao

* Redact PDF.
* Compare PDF.
* PDF to Markdown.
* PDF/A.
* Advanced Edit PDF.
* AI PDF Assistant.
* Recent Files có lưu trữ phù hợp.
* Tài khoản người dùng nếu thực sự cần.

Không chuyển sang P1 chỉ vì giao diện P0 đã hoàn thiện. P0 phải có khả năng xử lý tệp thực tế và vượt qua acceptance tests.

---

# 18. Acceptance Criteria tổng thể

## Scenario A — Merge PDF

1. Tải lên ba PDF.
2. Sắp xếp lại thứ tự tệp.
3. Sắp xếp lại một số trang.
4. Preview.
5. Xuất PDF.
6. Xác nhận đúng số lượng và thứ tự trang.

## Scenario B — Split One PDF

1. Tải PDF 20 trang.
2. Nhập `1-3, 5-7, 9-13`.
3. Preview 11 trang.
4. Xuất một PDF duy nhất.
5. Kiểm tra đúng nội dung và thứ tự.

## Scenario C — Split Multiple PDFs

1. Tải PDF 20 trang.
2. Nhập `1-3, 5-7, 9-13`.
3. Chọn Multiple PDFs → Auto Split by Page Ranges.
4. Hệ thống tạo ba PDF.
5. Xuất ZIP chứa đúng ba PDF.

## Scenario D — Custom Split

1. Tạo PDF 1 gồm trang 1, 2, 3, 5.
2. Tạo PDF 2 gồm trang 6–9 và 12–16.
3. Tạo PDF 3 gồm trang 4, 10, 11, 17–20.
4. Preview từng nhóm.
5. Xuất ZIP.
6. Xác nhận đúng thứ tự trang trong từng tệp.

## Scenario E — Workflow Chaining

1. Merge hai PDF.
2. Chọn Continue to Compress.
3. Chọn Continue to Sign.
4. Xuất tài liệu.
5. Không phải upload lại.
6. Nếu bước Sign lỗi, bản đã nén vẫn tồn tại.

## Scenario F — File Naming

1. Đặt tên đầu ra tùy chỉnh.
2. Xuất tệp.
3. Kiểm tra tên, định dạng và nội dung.
4. Kiểm tra không ghi đè ngoài ý muốn.

## Scenario G — Error Handling

1. Tải tệp không hợp lệ.
2. Hiển thị lỗi rõ ràng.
3. Không làm treo ứng dụng.
4. Không làm mất tài liệu đang xử lý khác.

## Scenario H — Privacy

1. Xác định thao tác nào xử lý cục bộ và thao tác nào cần server.
2. Kiểm tra không gửi tài liệu tới dịch vụ ngoài một cách âm thầm.
3. Kiểm tra việc xóa tệp tạm theo chính sách.
4. Không ghi mật khẩu hoặc nội dung tài liệu vào log.

---

# 19. Đo lường thành công

* Tỷ lệ hoàn thành mỗi công cụ.
* Thời gian hoàn thành tác vụ.
* Tỷ lệ người dùng tiếp tục sang công cụ thứ hai.
* Tỷ lệ xuất tệp thành công.
* Tỷ lệ lỗi theo từng công cụ.
* Tỷ lệ hủy tác vụ.
* Hiệu năng trên tài liệu nhiều trang.
* Tỷ lệ lỗi trên desktop và mobile.

Không thu thập nội dung tài liệu hoặc chữ ký để phục vụ analytics.

---

# 20. Chỉ dẫn cuối cùng cho AI Coding Agent

Hãy phát triển sản phẩm như một ứng dụng thực tế, không phải prototype giao diện.

### Giai đoạn 1 — Khảo sát và lập kế hoạch

1. Đọc repository hiện tại.
2. Xác định framework, dependencies và môi trường triển khai.
3. Đề xuất kiến trúc phù hợp.
4. Xác định thư viện xử lý PDF và giới hạn của chúng.
5. Chia nhỏ implementation thành các giai đoạn có thể kiểm thử.

Không tự ý viết lại toàn bộ dự án nếu không cần thiết.

### Giai đoạn 2 — Xây dựng Workspace

1. Hoàn thiện design system.
2. Xây dựng file picker.
3. Xây dựng PDF preview.
4. Xây dựng thumbnail.
5. Xây dựng page selection và drag-and-drop.
6. Xây dựng page operations.
7. Xây dựng Undo/Redo.

### Giai đoạn 3 — Xây dựng các công cụ cốt lõi

1. Merge PDF.
2. Split One PDF.
3. Split Multiple PDFs — Auto Split.
4. Split Multiple PDFs — Custom Split.
5. ZIP export.
6. Compress PDF.
7. PDF to Image.
8. Sign PDF.
9. Workflow chaining.

### Giai đoạn 4 — Hoàn thiện và kiểm thử

1. Test tài liệu nhiều trang.
2. Test thứ tự trang sau kéo thả.
3. Test ZIP và tên tệp.
4. Test lỗi đầu vào.
5. Test workflow khi một bước thất bại.
6. Test responsive.
7. Test quyền riêng tư và quản lý tệp.
8. Kiểm tra toàn bộ nút bấm và thao tác.

### Coding Rules

* Sử dụng TypeScript strict mode nếu stack hỗ trợ.
* Tách UI, document state và processing engine.
* Tái sử dụng component preview, thumbnail, naming và export.
* Không viết toàn bộ ứng dụng trong một component.
* Không dùng dữ liệu giả trong luồng xử lý thật.
* Không tạo tiến trình phần trăm ngẫu nhiên.
* Không để nút bấm vô tác dụng.
* Không ghi đè tệp gốc.
* Có error handling và test cho các thao tác quan trọng.
* Ưu tiên tính đúng đắn của tệp đầu ra.
* Nếu một tính năng chưa thể triển khai, giải thích giới hạn và đề xuất giải pháp thực tế.

### Definition of Done

Một tính năng chỉ được coi là hoàn thành khi:

* UI hoạt động đúng.
* Có validation đầu vào.
* Logic xử lý thực tế hoạt động.
* Preview hoặc xác nhận kết quả phù hợp.
* Có xử lý lỗi.
* Không làm mất tài liệu nguồn.
* Tải xuống được tệp hợp lệ.
* Có test cho các trường hợp quan trọng.
* Hoạt động trên các thiết bị mục tiêu trong phạm vi hỗ trợ.

---

# Kết quả mong muốn

DocFlow phải trở thành một workspace xử lý tài liệu thống nhất, nơi người dùng có thể quản lý trang, chia PDF theo nhiều cách, tạo nhiều PDF tùy chỉnh, đóng gói ZIP, chuyển đổi, nén và ký tài liệu mà không bị ngắt quãng giữa các công cụ.

Điểm khác biệt quan trọng nhất không phải số lượng tính năng, mà là **khả năng kiểm soát từng trang và nối các thao tác xử lý thành một quy trình liên tục, trực quan và đáng tin cậy**.
