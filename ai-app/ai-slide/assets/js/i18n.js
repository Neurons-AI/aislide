/* AI Slide — UI language follows AICoworker (aicw.locale: en · vi · zh · ja · ko).
   Source strings are Vietnamese; this layer translates the editor chrome (never the user's slide content). */
(function () {
  const S = (window.Slide = window.Slide || {});
  // vi | en | zh | ja | ko
  const RAW = `Trang chủ (Tệp)|Home (File)|主页（文件）|ホーム（ファイル）|홈(파일)
Lưu (Ctrl+S)|Save (Ctrl+S)|保存 (Ctrl+S)|保存 (Ctrl+S)|저장 (Ctrl+S)
Hoàn tác (Ctrl+Z)|Undo (Ctrl+Z)|撤销 (Ctrl+Z)|元に戻す (Ctrl+Z)|실행 취소 (Ctrl+Z)
Làm lại (Ctrl+Y)|Redo (Ctrl+Y)|重做 (Ctrl+Y)|やり直し (Ctrl+Y)|다시 실행 (Ctrl+Y)
Trình chiếu từ đầu (F5)|Start from beginning (F5)|从头开始 (F5)|最初から (F5)|처음부터 (F5)
Tệp|File|文件|ファイル|파일
Trang đầu|Home|开始|ホーム|홈
Chèn|Insert|插入|挿入|삽입
Vẽ|Draw|绘图|描画|그리기
Thiết kế|Design|设计|デザイン|디자인
Chuyển tiếp|Transitions|切换|画面切り替え|전환
Hoạt hình|Animations|动画|アニメーション|애니메이션
Trình chiếu|Slide Show|幻灯片放映|スライドショー|슬라이드 쇼
Ghi|Record|录制|記録|녹음/녹화
Xem lại|Review|审阅|校閲|검토
Xem|View|视图|表示|보기
Định dạng hình|Shape Format|形状格式|図形の書式|도형 서식
Định dạng ảnh|Picture Format|图片格式|図の形式|그림 서식
Thiết kế bảng|Table Design|表设计|テーブル デザイン|테이블 디자인
Thiết kế biểu đồ|Chart Design|图表设计|グラフのデザイン|차트 디자인
Dán|Paste|粘贴|貼り付け|붙여넣기
Cắt|Cut|剪切|切り取り|잘라내기
Sao chép|Copy|复制|コピー|복사
Định dạng|Format|格式|書式|서식
Slide mới|New Slide|新建幻灯片|新しいスライド|새 슬라이드
Bố cục|Layout|版式|レイアウト|레이아웃
Đặt lại|Reset|重置|リセット|다시 설정
Phần|Section|节|セクション|구역
Ảnh|Picture|图片|画像|그림
Ảnh AI|AI Image|AI 图片|AI 画像|AI 이미지
Hình|Shapes|形状|図形|도형
Hộp văn bản|Text Box|文本框|テキスト ボックス|텍스트 상자
Sắp xếp|Arrange|排列|配置|정렬
Kiểu nhanh|Quick Styles|快速样式|クイック スタイル|빠른 스타일
Tô hình|Shape Fill|形状填充|図形の塗りつぶし|도형 채우기
Viền hình|Shape Outline|形状轮廓|図形の枠線|도형 윤곽선
Hiệu ứng|Effects|效果|効果|효과
Hiệu ứng hình|Shape Effects|形状效果|図形の効果|도형 효과
Ý tưởng|Design|设计|デザイン|디자인
thiết kế|Ideas|灵感|アイデア|아이디어
Phông chữ|Font|字体|フォント|글꼴
Cỡ chữ|Font Size|字号|フォント サイズ|글꼴 크기
Tăng cỡ chữ (Ctrl+])|Increase Font Size (Ctrl+])|增大字号 (Ctrl+])|フォント拡大 (Ctrl+])|글꼴 크게 (Ctrl+])
Giảm cỡ chữ (Ctrl+[)|Decrease Font Size (Ctrl+[)|减小字号 (Ctrl+[)|フォント縮小 (Ctrl+[)|글꼴 작게 (Ctrl+[)
Xoá định dạng|Clear Formatting|清除格式|書式のクリア|서식 지우기
Đậm (Ctrl+B)|Bold (Ctrl+B)|加粗 (Ctrl+B)|太字 (Ctrl+B)|굵게 (Ctrl+B)
Nghiêng (Ctrl+I)|Italic (Ctrl+I)|倾斜 (Ctrl+I)|斜体 (Ctrl+I)|기울임꼴 (Ctrl+I)
Gạch chân (Ctrl+U)|Underline (Ctrl+U)|下划线 (Ctrl+U)|下線 (Ctrl+U)|밑줄 (Ctrl+U)
Gạch ngang|Strikethrough|删除线|取り消し線|취소선
Chỉ số trên|Superscript|上标|上付き|위 첨자
Chỉ số dưới|Subscript|下标|下付き|아래 첨자
Chữ hoa|Change Case|更改大小写|大文字/小文字|대/소문자
Màu nền chữ|Highlight Color|突出显示颜色|蛍光ペンの色|형광펜 색
Màu chữ|Font Color|字体颜色|フォントの色|글꼴 색
Gạch đầu dòng|Bullets|项目符号|箇条書き|글머리 기호
Đánh số|Numbering|编号|段落番号|번호 매기기
Giảm mức|Decrease List Level|降低列表级别|レベル上げ|목록 수준 줄임
Tăng mức|Increase List Level|提高列表级别|レベル下げ|목록 수준 늘림
Giãn dòng|Line Spacing|行距|行間|줄 간격
Cột|Columns|栏|段組み|단
Căn trái|Align Left|左对齐|左揃え|왼쪽 맞춤
Căn giữa|Center|居中|中央揃え|가운데 맞춤
Căn phải|Align Right|右对齐|右揃え|오른쪽 맞춤
Căn đều|Justify|两端对齐|両端揃え|양쪽 맞춤
Căn trên|Align Top|顶端对齐|上揃え|위쪽 맞춤
Căn giữa dọc|Align Middle|垂直居中|上下中央揃え|중간 맞춤
Căn dưới|Align Bottom|底端对齐|下揃え|아래쪽 맞춤
Bảng|Table|表格|表|표
Biểu đồ|Chart|图表|グラフ|차트
Liên kết|Link|链接|リンク|링크
Đầu & chân|Header &|页眉和|ヘッダーと|머리글/
trang|Footer|页脚|フッター|바닥글
WordArt|WordArt|艺术字|ワードアート|WordArt
Ký hiệu|Symbol|符号|記号|기호
Số slide|Slide Number|幻灯片编号|スライド番号|슬라이드 번호
Ngày giờ|Date & Time|日期和时间|日付と時刻|날짜 및 시간
Bút|Pen|笔|ペン|펜
Bút dạ|Highlighter|荧光笔|蛍光ペン|형광펜
Chọn|Select|选择|選択|선택
Màu bút|Pen Color|笔颜色|ペンの色|펜 색
Nét|Width|粗细|太さ|두께
Kéo chuột trên slide để vẽ tự do. Nét vẽ được lưu như một hình ảnh trên slide.|Drag on the slide to draw freehand. Ink is saved as a picture on the slide.|在幻灯片上拖动即可自由绘制，笔迹保存为图片。|スライド上をドラッグして描画します。インクは画像として保存されます。|슬라이드에서 드래그하여 그립니다. 잉크는 그림으로 저장됩니다.
Kích thước|Slide|幻灯片|スライドの|슬라이드
slide|Size|大小|サイズ|크기
Định dạng|Format|设置|背景の|배경
nền|Background|背景格式|書式設定|서식
Xem trước|Preview|预览|プレビュー|미리 보기
Không|None|无|なし|없음
Mờ dần|Fade|淡入|フェード|페이드
Đẩy|Push|推入|プッシュ|밀어내기
Lau|Wipe|擦除|ワイプ|닦아내기
Tách|Split|分割|スプリット|나누기
Che|Cover|覆盖|カバー|덮기
Phóng|Zoom|缩放|ズーム|확대/축소
Thời lượng (giây)|Duration (s)|持续时间(秒)|期間 (秒)|기간(초)
Tự chuyển sau|After|之后|自動的に切り替え|다음 시간 후
Áp dụng cho tất cả|Apply To All|应用到全部|すべてに適用|모두 적용
Xuất hiện|Appear|出现|表示|나타내기
Bay vào|Fly In|飞入|スライドイン|날아오기
Phóng to|Zoom|缩放|ズーム|확대/축소
Trôi lên|Float In|浮入|フロートイン|떠오르기
Nhịp (nhấn mạnh)|Pulse (emphasis)|脉冲(强调)|パルス (強調)|펄스(강조)
Xoay (nhấn mạnh)|Spin (emphasis)|陀螺旋(强调)|スピン (強調)|회전(강조)
Mờ đi (thoát)|Fade Out (exit)|淡出(退出)|フェードアウト (終了)|페이드 아웃(끝내기)
Bắt đầu|Start|开始|開始|시작
Khi bấm|On Click|单击时|クリック時|클릭할 때
Cùng lúc|With Previous|与上一动画同时|直前の動作と同時|이전 효과와 함께
Sau đó|After Previous|上一动画之后|直前の動作の後|이전 효과 다음에
Thời lượng|Duration|持续时间|継続時間|재생 시간
Theo từng đoạn|By Paragraph|按段落|段落別|단락별로
Từ đầu|From Beginning|从头开始|最初から|처음부터
Từ slide|From Current|从当前|現在の|현재
hiện tại|Slide|幻灯片开始|スライドから|슬라이드부터
Chế độ|Presenter|演示者|発表者|발표자
người trình bày|View|视图|ツール|보기
Ẩn slide|Hide Slide|隐藏幻灯片|非表示スライド|슬라이드 숨기기
Diễn tập|Rehearse|排练|リハーサル|예행
bấm giờ|Timings|计时||연습
Lặp lại đến khi bấm Esc|Loop until Esc|循环放映，按 Esc 终止|Esc キーが押されるまで繰り返す|Esc를 누를 때까지 반복
Ghi âm|Record|录制|ナレーションの|내레이션
thuyết minh|Narration|旁白|録音|녹음
Xuất GIF|Export|导出|GIF|GIF로
động|GIF|GIF|エクスポート|내보내기
Chính tả|Spelling|拼写|スペル|맞춤법
Dịch|Translate|翻译|翻訳|번역
Nhận xét|Comments|批注|コメント|메모
mới|New|新建|新規|새
Hiện|Show|显示|表示|표시
nhận xét|Comments|批注|コメント|메모
Tóm tắt|Summarize|摘要|要約|요약
bản trình chiếu|Presentation|演示文稿|プレゼンテーション|프레젠테이션
Thường|Normal|普通|標準|기본
Sắp xếp|Slide|幻灯片|スライド|여러
Ghi chú|Notes|备注|ノート|슬라이드 노트
Đọc|Reading|阅读|閲覧|읽기
Lưới|Gridlines|网格线|グリッド線|눈금선
Đường gióng|Guides|参考线|ガイド|안내선
Thu phóng|Zoom|缩放|ズーム|확대/축소
Vừa cửa sổ|Fit to Window|适应窗口|ウィンドウに合わせる|창에 맞춤
Sáng / Tối|Light / Dark|浅色 / 深色|ライト / ダーク|밝게 / 어둡게
Đổi hình|Edit Shape|编辑形状|図形の編集|도형 편집
Viền chữ|Text Outline|文本轮廓|文字の輪郭|텍스트 윤곽선
Bóng chữ|Text Shadow|文本阴影|文字の影|텍스트 그림자
Văn bản|Alt|可选|代替|대체
thay thế|Text|文字|テキスト|텍스트
Đưa lên|Bring Forward|上移一层|前面へ移動|앞으로 가져오기
Đưa xuống|Send Backward|下移一层|背面へ移動|뒤로 보내기
Căn chỉnh|Align|对齐|配置|맞춤
Nhóm|Group|组合|グループ化|그룹
Xoay|Rotate|旋转|回転|회전
Cao:|Height:|高度:|高さ:|높이:
Rộng:|Width:|宽度:|幅:|너비:
Hiệu chỉnh|Corrections|校正|修整|수정
Đen trắng|Grayscale|灰度|グレースケール|회색조
Cắt tròn|Crop to Circle|裁剪为圆形|円形に切り抜き|원형으로 자르기
Cắt xén|Crop|裁剪|トリミング|자르기
Đổi ảnh|Change Picture|更改图片|図の変更|그림 바꾸기
Đặt lại ảnh|Reset Picture|重置图片|図のリセット|그림 원래대로
Viền ảnh|Picture Border|图片边框|図の枠線|그림 테두리
Hàng tiêu đề|Header Row|标题行|タイトル行|머리글 행
Hàng xen màu|Banded Rows|镶边行|縞模様 (行)|줄무늬 행
Chèn hàng trên|Insert Above|在上方插入|上に行を挿入|위에 삽입
Chèn hàng dưới|Insert Below|在下方插入|下に行を挿入|아래에 삽입
Xoá hàng|Delete Row|删除行|行の削除|행 삭제
Chèn cột trái|Insert Left|在左侧插入|左に列を挿入|왼쪽에 삽입
Chèn cột phải|Insert Right|在右侧插入|右に列を挿入|오른쪽에 삽입
Xoá cột|Delete Column|删除列|列の削除|열 삭제
Tô ô|Cell Shading|底纹|セルの塗りつぶし|음영
Cột nhóm|Clustered Column|簇状柱形图|集合縦棒|묶은 세로 막대형
Thanh|Bar|条形图|横棒|가로 막대형
Thanh ngang|Bar|条形图|横棒|가로 막대형
Đường|Line|折线图|折れ線|꺾은선형
Vùng|Area|面积图|面|영역형
Tròn|Pie|饼图|円|원형
Vành khuyên|Doughnut|圆环图|ドーナツ|도넛형
Sửa dữ liệu|Edit Data|编辑数据|データの編集|데이터 편집
Mô hình AI|AI model|AI 模型|AI モデル|AI 모델
Giao diện sáng/tối|Light/dark appearance|浅色/深色外观|ライト/ダーク表示|밝게/어둡게
Tìm (Ctrl+F)|Find (Ctrl+F)|查找 (Ctrl+F)|検索 (Ctrl+F)|찾기 (Ctrl+F)
Bấm để thêm ghi chú|Click to add notes|单击此处添加备注|クリックしてノートを追加|클릭하여 슬라이드 노트 추가
Tiếng Việt|English (United States)|中文(中国)|日本語|한국어
Sắp xếp slide|Slide Sorter|幻灯片浏览|スライド一覧|여러 슬라이드
Bấm để thêm tiêu đề|Click to add title|单击此处添加标题|クリックしてタイトルを入力|제목을 입력하십시오
Bấm để thêm phụ đề|Click to add subtitle|单击此处添加副标题|クリックしてサブタイトルを入力|부제목을 입력하십시오
Bấm để thêm văn bản|Click to add text|单击此处添加文本|クリックしてテキストを入力|텍스트를 입력하십시오
Bấm biểu tượng để thêm ảnh|Click icon to add picture|单击图标添加图片|アイコンをクリックして図を追加|아이콘을 클릭하여 그림 추가
Hình cơ bản, mũi tên, lưu đồ, chú thích|Basic shapes, arrows, flowchart, callouts|基本形状、箭头、流程图、标注|基本図形・矢印・フローチャート・吹き出し|기본 도형, 화살표, 순서도, 설명선
Hình chữ nhật|Rectangle|矩形|正方形/長方形|직사각형
Chữ nhật bo góc|Rounded Rectangle|圆角矩形|角丸四角形|모서리가 둥근 직사각형
Hình elip|Oval|椭圆|楕円|타원
Tam giác|Triangle|三角形|二等辺三角形|이등변 삼각형
Tam giác vuông|Right Triangle|直角三角形|直角三角形|직각 삼각형
Hình thoi|Diamond|菱形|ひし形|다이아몬드
Hình bình hành|Parallelogram|平行四边形|平行四辺形|평행 사변형
Hình thang|Trapezoid|梯形|台形|사다리꼴
Ngũ giác|Pentagon|五边形|五角形|오각형
Lục giác|Hexagon|六边形|六角形|육각형
Bát giác|Octagon|八边形|八角形|팔각형
Dấu cộng|Plus|加号|十字形|더하기 기호
Hình trụ|Can|圆柱形|円柱|원통형
Khối lập phương|Cube|立方体|直方体|정육면체
Trái tim|Heart|心形|ハート|하트
Sao 5 cánh|5-Point Star|五角星|星 5|별: 꼭짓점 5개
Sao 6 cánh|6-Point Star|六角星|星 6|별: 꼭짓점 6개
Đám mây|Cloud|云形|雲|구름
Mũi tên phải|Right Arrow|右箭头|右矢印|오른쪽 화살표
Mũi tên trái|Left Arrow|左箭头|左矢印|왼쪽 화살표
Mũi tên lên|Up Arrow|上箭头|上矢印|위쪽 화살표
Mũi tên xuống|Down Arrow|下箭头|下矢印|아래쪽 화살표
Mũi tên hai chiều|Left-Right Arrow|左右箭头|左右矢印|왼쪽/오른쪽 화살표
Mũi tên khối|Pentagon Arrow|五边形箭头|ホームベース|오각형 화살표
Chú thích|Callout|标注|吹き出し|설명선
Chú thích bo góc|Rounded Callout|圆角矩形标注|角丸吹き出し|둥근 설명선
Lưu đồ: Xử lý|Flowchart: Process|流程图：过程|フローチャート: 処理|순서도: 처리
Lưu đồ: Quyết định|Flowchart: Decision|流程图：决策|フローチャート: 判断|순서도: 판단
Lưu đồ: Kết thúc|Flowchart: Terminator|流程图：终止|フローチャート: 端子|순서도: 단말
Đường thẳng|Line|直线|直線|선
Nhân bản slide đang chọn|Duplicate Selected Slide|复制所选幻灯片|選択したスライドの複製|선택한 슬라이드 복제
Slide từ dàn ý (văn bản)…|Slides from Outline…|从大纲创建幻灯片…|アウトラインからスライド…|개요에서 슬라이드…
Dùng lại slide từ tệp khác…|Reuse Slides…|重用幻灯片…|スライドの再利用…|슬라이드 다시 사용…
Thêm phần trước slide này|Add Section|新增节|セクションの追加|구역 추가
Đổi tên phần|Rename Section|重命名节|セクション名の変更|구역 이름 바꾸기
Xoá phần|Remove Section|删除节|セクションの削除|구역 제거
Thu gọn tất cả|Collapse All|全部折叠|すべて折りたたみ|모두 축소
Mở rộng tất cả|Expand All|全部展开|すべて展開|모두 확장
Ảnh từ máy tính…|This Device…|此设备…|このデバイス…|이 디바이스…
Ảnh từ đường link…|From a link…|来自链接…|リンクから…|링크에서…
✨ Tạo ảnh bằng AI…|✨ Generate with AI…|✨ 用 AI 生成…|✨ AI で生成…|✨ AI로 생성…
Chèn bảng|Insert Table|插入表格|表の挿入|표 삽입
Chèn bảng…|Insert Table…|插入表格…|表の挿入…|표 삽입…
Thứ tự|Order|排序|順序|순서
Đưa lên trên cùng|Bring to Front|置于顶层|最前面へ移動|맨 앞으로 가져오기
Đưa lên một lớp|Bring Forward|上移一层|前面へ移動|앞으로 가져오기
Đưa xuống một lớp|Send Backward|下移一层|背面へ移動|뒤로 보내기
Đưa xuống dưới cùng|Send to Back|置于底层|最背面へ移動|맨 뒤로 보내기
Bỏ nhóm|Ungroup|取消组合|グループ解除|그룹 해제
Căn|Align|对齐|配置|맞춤
Phân bố ngang|Distribute Horizontally|横向分布|左右に整列|가로 간격 동일하게
Phân bố dọc|Distribute Vertically|纵向分布|上下に整列|세로 간격 동일하게
Xoay phải 90°|Rotate Right 90°|向右旋转 90°|右へ 90 度回転|오른쪽으로 90° 회전
Xoay trái 90°|Rotate Left 90°|向左旋转 90°|左へ 90 度回転|왼쪽으로 90° 회전
Lật ngang|Flip Horizontal|水平翻转|左右反転|좌우 대칭
Lật dọc|Flip Vertical|垂直翻转|上下反転|상하 대칭
Màu chủ đề & chuẩn|Theme & Standard Colors|主题颜色和标准色|テーマと標準の色|테마 및 표준 색
Không tô|No Fill|无填充|塗りつぶしなし|채우기 없음
Màu khác…|More Colors…|其他颜色…|その他の色…|다른 색…
Độ dày|Weight|粗细|太さ|두께
Liền|Solid|实线|実線|실선
Gạch|Dash|短划线|破線|파선
Chấm|Dot|点线|点線|점선
Gạch chấm|Dash Dot|点划线|一点鎖線|파선-점선
Mũi tên ở cuối (đường thẳng)|Arrow at end (lines)|末端箭头(直线)|終点矢印 (直線)|끝 화살표(선)
Đổ bóng|Shadow|阴影|影|그림자
Không bóng|No Shadow|无阴影|影なし|그림자 없음
Độ trong suốt|Transparency|透明度|透明度|투명도
Độ sáng / Tương phản|Brightness / Contrast|亮度/对比度|明るさ/コントラスト|밝기/대비
Sáng|Brightness|亮度|明るさ|밝기
Tương phản|Contrast|对比度|コントラスト|대비
Cắt xén ảnh|Crop Picture|裁剪图片|図のトリミング|그림 자르기
Bỏ cắt xén|Remove Crop|取消裁剪|トリミング解除|자르기 제거
Vuông 1:1 (giữa)|Square 1:1 (center)|正方形 1:1(居中)|正方形 1:1 (中央)|정사각형 1:1(가운데)
Tỉ lệ 16:9 (giữa)|16:9 (center)|16:9(居中)|16:9 (中央)|16:9(가운데)
Tỉ lệ 4:3 (giữa)|4:3 (center)|4:3(居中)|4:3 (中央)|4:3(가운데)
Cắt 10% mỗi cạnh|Trim 10% each side|每边裁剪 10%|各辺 10% トリミング|각 변 10% 자르기
Nhập % trái, trên, phải, dưới…|Enter % left, top, right, bottom…|输入左、上、右、下 %…|左・上・右・下の % を入力…|왼쪽, 위, 오른쪽, 아래 % 입력…
Màn hình rộng (16:9)|Widescreen (16:9)|宽屏(16:9)|ワイド画面 (16:9)|와이드스크린(16:9)
Chuẩn (4:3)|Standard (4:3)|标准(4:3)|標準 (4:3)|표준(4:3)
Giấy A4|A4 Paper|A4 纸张|A4 用紙|A4 용지
Dọc 9:16 (story)|Portrait 9:16 (story)|竖版 9:16|縦 9:16 (ストーリー)|세로 9:16(스토리)
Kích thước tuỳ chỉnh…|Custom Slide Size…|自定义大小…|ユーザー設定のサイズ…|사용자 지정 크기…
Chuyển sắc|Gradient|渐变|グラデーション|그라데이션
Ảnh nền…|Picture background…|图片背景…|画像の背景…|그림 배경…
Đặt lại nền|Reset Background|重置背景|背景のリセット|배경 원래대로
Áp dụng nền này cho tất cả slide|Apply to All|全部应用|すべてに適用|모두 적용
Ý tưởng thiết kế cho slide|Design ideas for slide|幻灯片设计灵感|スライドのデザイン アイデア|슬라이드 디자인 아이디어
Nhận xét slide|Comments on slide|幻灯片批注|スライドのコメント|슬라이드 메모
Chưa có nhận xét.|No comments yet.|暂无批注。|コメントはありません。|메모가 없습니다.
+ Nhận xét mới|+ New Comment|+ 新建批注|+ 新しいコメント|+ 새 메모
Xoá|Delete|删除|削除|삭제
Slide mới|New Slide|新建幻灯片|新しいスライド|새 슬라이드
Nhân bản slide|Duplicate Slide|复制幻灯片|スライドの複製|슬라이드 복제
Xoá slide|Delete Slide|删除幻灯片|スライドの削除|슬라이드 삭제
Hiện slide|Show Slide|显示幻灯片|スライドを表示|슬라이드 표시
Thêm phần…|Add Section…|新增节…|セクションの追加…|구역 추가…
Bố cục…|Layout…|版式…|レイアウト…|레이아웃…
Nhân bản|Duplicate|复制|複製|복제
Liên kết…|Link…|链接…|リンク…|링크…
Văn bản thay thế…|Edit Alt Text…|编辑替换文字…|代替テキストの編集…|대체 텍스트 편집…
✨ AI viết lại chữ|✨ Rewrite with AI|✨ AI 改写|✨ AI で書き直し|✨ AI로 다시 쓰기
Đặt lại slide|Reset Slide|重置幻灯片|スライドのリセット|슬라이드 원래대로
Định dạng nền…|Format Background…|设置背景格式…|背景の書式設定…|배경 서식…
Bật/tắt lưới|Toggle Gridlines|切换网格线|グリッド線の切り替え|눈금선 표시/숨기기
Đầu trang & chân trang|Header & Footer|页眉和页脚|ヘッダーとフッター|머리글/바닥글
Chân trang:|Footer:|页脚:|フッター:|바닥글:
Nội dung chân trang|Footer text|页脚文字|フッターの文字|바닥글 텍스트
Không hiện trên slide tiêu đề|Don't show on title slide|标题幻灯片中不显示|タイトル スライドに表示しない|제목 슬라이드에는 표시 안 함
Áp dụng tất cả|Apply to All|全部应用|すべてに適用|모두 적용
Áp dụng|Apply|应用|適用|적용
Đóng|Close|关闭|閉じる|닫기
Sửa dữ liệu biểu đồ|Edit Chart Data|编辑图表数据|グラフ データの編集|차트 데이터 편집
Tiêu đề|Title|标题|タイトル|제목
Dòng đầu = tên chuỗi, cột đầu = nhãn. Ngăn cách bằng Tab hoặc dấu phẩy — có thể dán thẳng từ Excel.|First row = series names, first column = labels. Separate with Tab or comma — paste straight from Excel.|首行为系列名，首列为标签；用 Tab 或逗号分隔，可直接从 Excel 粘贴。|1 行目 = 系列名、1 列目 = ラベル。Tab かカンマ区切り — Excel から直接貼り付け可。|첫 행 = 계열 이름, 첫 열 = 레이블. 탭이나 쉼표로 구분 — Excel에서 바로 붙여넣기 가능.
Cập nhật|Update|更新|更新|업데이트
Tìm & thay thế|Find & Replace|查找和替换|検索と置換|찾기 및 바꾸기
Tìm|Find|查找|検索|찾기
Thay bằng|Replace with|替换为|置換後の文字列|바꿀 내용
Tìm tiếp|Find Next|查找下一个|次を検索|다음 찾기
Thay tất cả|Replace All|全部替换|すべて置換|모두 바꾸기
Không thấy|Not found|未找到|見つかりません|찾을 수 없음
Kết thúc trình chiếu|End Show|结束放映|スライド ショーの終了|쇼 마치기
Tiếp theo|Next|下一张|次|다음
◀ Trước|◀ Previous|◀ 上一张|◀ 前へ|◀ 이전
Tiếp ▶|Next ▶|下一张 ▶|次へ ▶|다음 ▶
(Không có ghi chú)|(No notes)|(无备注)|(ノートなし)|(노트 없음)
Kết thúc|End|结束|終了|끝
Trước|Previous|上一张|前へ|이전
Tiếp|Next|下一张|次へ|다음
Màn hình đen (B)|Black screen (B)|黑屏 (B)|黒い画面 (B)|검정 화면 (B)
Kết thúc (Esc)|End (Esc)|结束 (Esc)|終了 (Esc)|끝내기 (Esc)
Mới|New|新建|新規|새로 만들기
Mở|Open|打开|開く|열기
Lưu|Save|保存|保存|저장
Lưu thành|Save As|另存为|名前を付けて保存|다른 이름으로 저장
Xuất|Export|导出|エクスポート|내보내기
In|Print|打印|印刷|인쇄
Thông tin|Info|信息|情報|정보
✨ Tạo bằng AI|✨ Create with AI|✨ 用 AI 创建|✨ AI で作成|✨ AI로 만들기
Tạo bản trình chiếu từ chủ đề…|Create a presentation from a topic…|根据主题创建演示文稿…|トピックからプレゼンテーションを作成…|주제로 프레젠테이션 만들기…
Kéo thả tệp PowerPoint vào đây|Drop a PowerPoint file here|将 PowerPoint 文件拖到此处|PowerPoint ファイルをここにドロップ|PowerPoint 파일을 여기에 놓으세요
Chọn tệp…|Browse…|浏览…|参照…|찾아보기…
GẦN ĐÂY (đã mở/lưu)|RECENT (opened/saved)|最近（打开/保存）|最近使ったファイル|최근 항목
Tên tệp|File name|文件名|ファイル名|파일 이름
Bản trình chiếu PowerPoint|PowerPoint Presentation|PowerPoint 演示文稿|PowerPoint プレゼンテーション|PowerPoint 프레젠테이션
Trình chiếu PowerPoint|PowerPoint Show|PowerPoint 放映|PowerPoint スライド ショー|PowerPoint 쇼
Mẫu PowerPoint|PowerPoint Template|PowerPoint 模板|PowerPoint テンプレート|PowerPoint 서식 파일
PowerPoint có macro|PowerPoint Macro-Enabled Presentation|启用宏的演示文稿|マクロ有効プレゼンテーション|매크로 사용 프레젠테이션
Trình chiếu có macro|Macro-Enabled Show|启用宏的放映|マクロ有効スライド ショー|매크로 사용 쇼
Mẫu có macro|Macro-Enabled Template|启用宏的模板|マクロ有効テンプレート|매크로 사용 서식 파일
PowerPoint 97-2003|PowerPoint 97-2003 Presentation|PowerPoint 97-2003 演示文稿|PowerPoint 97-2003 プレゼンテーション|PowerPoint 97-2003 프레젠테이션
Trình chiếu 97-2003|PowerPoint 97-2003 Show|PowerPoint 97-2003 放映|PowerPoint 97-2003 スライド ショー|PowerPoint 97-2003 쇼
Mẫu 97-2003|PowerPoint 97-2003 Template|PowerPoint 97-2003 模板|PowerPoint 97-2003 テンプレート|PowerPoint 97-2003 서식 파일
Mẫu OpenDocument|OpenDocument Template|OpenDocument 模板|OpenDocument テンプレート|OpenDocument 서식 파일
Ảnh PNG|PNG Image|PNG 图片|PNG 画像|PNG 이미지
Ảnh JPEG|JPEG Image|JPEG 图片|JPEG 画像|JPEG 이미지
GIF động|Animated GIF|GIF 动画|アニメーション GIF|애니메이션 GIF
Dàn ý RTF|Outline/RTF|大纲/RTF|アウトライン/RTF|개요/RTF
Dàn ý văn bản|Outline (text)|大纲(文本)|アウトライン (テキスト)|개요(텍스트)
.pptx — mặc định, mở được trên mọi PowerPoint 2007+, Keynote, Google Slides|.pptx — default; opens in PowerPoint 2007+, Keynote, Google Slides|.pptx — 默认，可在 PowerPoint 2007+、Keynote、Google 幻灯片中打开|.pptx — 既定。PowerPoint 2007 以降、Keynote、Google スライドで開けます|.pptx — 기본값, PowerPoint 2007+, Keynote, Google 슬라이드에서 열림
.ppsx — mở ra là chạy trình chiếu luôn|.ppsx — opens straight into the slide show|.ppsx — 打开即放映|.ppsx — 開くとすぐスライド ショー|.ppsx — 열면 바로 쇼 시작
.potx — dùng làm mẫu cho bản trình chiếu mới|.potx — a template for new presentations|.potx — 用作新演示文稿的模板|.potx — 新しいプレゼンテーションのテンプレート|.potx — 새 프레젠테이션용 서식 파일
.ppt — cần LibreOffice trên máy, nếu không sẽ lưu .pptx|.ppt — needs LibreOffice on this computer, otherwise saved as .pptx|.ppt — 需要本机安装 LibreOffice，否则保存为 .pptx|.ppt — LibreOffice が必要。ない場合は .pptx で保存|.ppt — LibreOffice 필요, 없으면 .pptx로 저장
.odp — LibreOffice Impress|.odp — LibreOffice Impress|.odp — LibreOffice Impress|.odp — LibreOffice Impress|.odp — LibreOffice Impress
.pdf — mỗi slide một trang|.pdf — one page per slide|.pdf — 每张幻灯片一页|.pdf — 1 スライド 1 ページ|.pdf — 슬라이드당 한 페이지
.png — từng slide, tải về từng ảnh|.png — each slide as an image|.png — 每张幻灯片一张图片|.png — スライドごとに画像|.png — 슬라이드마다 이미지
.jpg — từng slide|.jpg — each slide|.jpg — 每张幻灯片|.jpg — スライドごと|.jpg — 슬라이드마다
.gif — cả bản trình chiếu thành ảnh động|.gif — the whole deck as an animation|.gif — 整个演示文稿生成动画|.gif — 全体をアニメーションに|.gif — 전체를 애니메이션으로
.rtf — chỉ phần chữ|.rtf — text only|.rtf — 仅文本|.rtf — テキストのみ|.rtf — 텍스트만
⚠️ máy này chưa có LibreOffice|⚠️ LibreOffice not installed here|⚠️ 本机未安装 LibreOffice|⚠️ LibreOffice がありません|⚠️ LibreOffice 미설치
Số slide|Slides|幻灯片数|スライド数|슬라이드 수
Số từ|Words|字数|単語数|단어 수
Tệp:|File:|文件:|ファイル:|파일:
Chủ đề:|Theme:|主题:|テーマ:|테마:
(chưa lưu)|(not saved)|(未保存)|(未保存)|(저장 안 됨)
Mỗi dòng không thụt lề = một slide mới (tiêu đề); dòng bắt đầu bằng "-" hoặc thụt lề = gạch đầu dòng.|Each unindented line = a new slide (title); lines starting with "-" or indented = bullets.|未缩进的行为新幻灯片标题；以 "-" 开头或缩进的行为项目符号。|インデントなしの行 = 新しいスライド (タイトル)、"-" で始まる行やインデント行 = 箇条書き。|들여쓰지 않은 줄 = 새 슬라이드(제목), "-"로 시작하거나 들여쓴 줄 = 글머리 기호.
Thêm vào bản trình chiếu|Add to presentation|添加到演示文稿|プレゼンテーションに追加|프레젠테이션에 추가
Slide từ dàn ý|Slides from Outline|从大纲创建幻灯片|アウトラインからスライド|개요에서 슬라이드
Tạo bản trình chiếu|Create presentation|创建演示文稿|プレゼンテーションを作成|프레젠테이션 만들기
Thêm slide|Add slide|添加幻灯片|スライドを追加|슬라이드 추가
Sửa chữ|Edit text|编辑文字|テキストを編集|텍스트 편집
Số slide|Slides|幻灯片数|スライド数|슬라이드 수
Ngôn ngữ|Language|语言|言語|언어
Ghi chú người nói|Speaker notes|演讲者备注|発表者ノート|발표자 노트
Tạo|Create|创建|作成|만들기
Thêm slide sau slide hiện tại|Add after current slide|在当前幻灯片后添加|現在のスライドの後に追加|현재 슬라이드 뒤에 추가
Chọn hộp chữ trên slide (hoặc không chọn gì = cả slide), rồi:|Select a text box (or nothing = whole slide), then:|选择文本框（不选=整张幻灯片），然后：|テキスト ボックスを選択 (未選択 = スライド全体) してから:|텍스트 상자를 선택(없으면 슬라이드 전체)한 다음:
Viết hay hơn|Improve|润色|改善|개선
Ngắn gọn hơn|Shorter|更简洁|短く|더 짧게
Chi tiết hơn|Longer|更详细|詳しく|더 자세히
Sửa chính tả|Fix spelling|修正拼写|スペル修正|맞춤법 수정
Dịch Anh ↔ Việt|Translate EN ↔ VI|翻译 英↔越|翻訳 英↔越|번역 영↔베
Viết ghi chú người nói|Write speaker notes|撰写演讲者备注|発表者ノートを作成|발표자 노트 작성
Thêm thành slide tóm tắt|Add as summary slide|添加为摘要幻灯片|要約スライドとして追加|요약 슬라이드로 추가
✨ Tạo ảnh bằng AI|✨ Generate image with AI|✨ 用 AI 生成图片|✨ AI で画像を生成|✨ AI로 이미지 생성
Ngang 16:9|Landscape 16:9|横版 16:9|横 16:9|가로 16:9
Vuông|Square|正方形|正方形|정사각형
Dọc|Portrait|竖版|縦|세로
Tạo ảnh|Generate|生成|生成|생성
Chủ đề, ví dụ: Giới thiệu sản phẩm AI Coworker cho khách hàng doanh nghiệp, 8 slide, giọng chuyên nghiệp|Topic, e.g. Introduce AI Coworker to enterprise customers, 8 slides, professional tone|主题，例如：向企业客户介绍 AI Coworker，8 张幻灯片，专业语气|トピック 例: 法人顧客向け AI Coworker 紹介、8 枚、ビジネス調|주제 예: 기업 고객 대상 AI Coworker 소개, 8장, 전문적인 어조
Nội dung slide cần thêm, ví dụ: So sánh 3 gói giá Basic/Pro/Team|What the slide should say, e.g. Compare Basic/Pro/Team plans|幻灯片内容，例如：比较 Basic/Pro/Team 三个套餐|スライドの内容 例: Basic/Pro/Team プランの比較|슬라이드 내용 예: Basic/Pro/Team 요금제 비교
Mô tả ảnh, ví dụ: văn phòng hiện đại tông cam, ánh sáng tự nhiên, phong cách ảnh chụp|Describe the picture, e.g. modern orange office, natural light, photo style|描述图片，例如：现代橙色办公室，自然光，摄影风格|画像の説明 例: オレンジ基調のモダンなオフィス、自然光、写真風|이미지 설명 예: 주황색 톤의 현대적인 사무실, 자연광, 사진 스타일
Bỏ bản đang soạn (đã tự lưu nháp) và tạo bản mới?|Discard the current deck (draft auto-saved) and start a new one?|放弃当前演示文稿（已自动保存草稿）并新建？|現在のプレゼンテーション (自動保存済み) を破棄して新規作成しますか?|현재 프레젠테이션(초안 자동 저장됨)을 버리고 새로 만들까요?
Bộ nhớ tạm trống|Clipboard is empty|剪贴板为空|クリップボードは空です|클립보드가 비어 있음
Bộ nhớ tạm trống — dùng Ctrl+V để dán ảnh/chữ từ ngoài|Clipboard is empty — use Ctrl+V to paste pictures/text from outside|剪贴板为空 — 使用 Ctrl+V 粘贴外部图片/文字|クリップボードは空です — 外部の画像/文字は Ctrl+V で貼り付け|클립보드가 비어 있음 — 외부 그림/텍스트는 Ctrl+V
Bản trình chiếu cần ít nhất một slide|A presentation needs at least one slide|演示文稿至少需要一张幻灯片|少なくとも 1 枚のスライドが必要です|최소 한 개의 슬라이드가 필요합니다
Bấm hoặc kéo trên slide để tạo hộp văn bản|Click or drag on the slide to create a text box|在幻灯片上单击或拖动以创建文本框|スライドをクリックまたはドラッグしてテキスト ボックスを作成|슬라이드를 클릭하거나 끌어 텍스트 상자 만들기
Bấm hoặc kéo trên slide để vẽ|Click or drag on the slide to draw|在幻灯片上单击或拖动以绘制|スライドをクリックまたはドラッグして描画|슬라이드를 클릭하거나 끌어 그리기
Bấm vào đối tượng để chép định dạng|Click an object to apply the format|单击对象以应用格式|オブジェクトをクリックして書式を適用|개체를 클릭하여 서식 적용
Chọn một đối tượng để thêm hoạt hình|Select an object to animate|选择要添加动画的对象|アニメーションを付けるオブジェクトを選択|애니메이션을 적용할 개체 선택
Chọn từ 2 đối tượng để nhóm|Select 2 or more objects to group|选择 2 个或更多对象以组合|2 つ以上のオブジェクトを選択|2개 이상의 개체를 선택하세요
Chọn đối tượng nguồn trước|Select the source object first|请先选择源对象|コピー元を選択してください|원본 개체를 먼저 선택하세요
Hãy chọn một biểu đồ|Select a chart|请选择图表|グラフを選択してください|차트를 선택하세요
Hãy chọn một hộp văn bản hoặc hình trước.|Select a text box or shape first.|请先选择文本框或形状。|テキスト ボックスか図形を選択してください。|텍스트 상자나 도형을 먼저 선택하세요.
Hãy chọn một hộp văn bản trước.|Select a text box first.|请先选择文本框。|テキスト ボックスを選択してください。|텍스트 상자를 먼저 선택하세요.
Hãy chọn một đối tượng trước.|Select an object first.|请先选择对象。|オブジェクトを選択してください。|개체를 먼저 선택하세요.
Hãy chọn một ảnh|Select a picture|请选择图片|画像を選択してください|그림을 선택하세요
Kéo chuột để vẽ. Bấm "Chọn" để dừng.|Drag to draw. Click "Select" to stop.|拖动以绘制，单击“选择”停止。|ドラッグして描画。「選択」で終了。|드래그하여 그리기. "선택"을 눌러 중지.
Slide nhập từ tệp: không có bố cục gốc để đặt lại|Imported slide: no original layout to reset to|导入的幻灯片：没有可重置的原始版式|インポートしたスライドには元のレイアウトがありません|가져온 슬라이드: 다시 설정할 원래 레이아웃이 없음
Slide này chưa có chữ để sửa|This slide has no text to edit|此幻灯片没有可编辑的文字|このスライドには編集する文字がありません|이 슬라이드에는 편집할 텍스트가 없습니다
Tính năng này cần mô hình AI — chọn một mô hình ở nút chọn mô hình góc trên.|This needs an AI model — pick one in the model menu at the top.|此功能需要 AI 模型 — 请在顶部的模型菜单中选择。|AI モデルが必要です — 上部のモデル メニューで選んでください。|AI 모델이 필요합니다 — 상단 모델 메뉴에서 선택하세요.
Đã bỏ nhóm|Ungrouped|已取消组合|グループ解除しました|그룹 해제됨
Đã nhóm — bấm vào một hình sẽ chọn cả nhóm|Grouped — clicking one shape selects the group|已组合 — 单击任一形状将选中整组|グループ化しました — 1 つをクリックでグループ全体を選択|그룹화됨 — 도형 하나를 클릭하면 그룹 전체 선택
Đã sao chép slide|Slide copied|已复制幻灯片|スライドをコピーしました|슬라이드 복사됨
Đã thêm nhận xét|Comment added|已添加批注|コメントを追加しました|메모 추가됨
Đã viết ghi chú|Notes written|已撰写备注|ノートを作成しました|노트 작성됨
Đã áp dụng chuyển tiếp cho mọi slide|Transition applied to all slides|已将切换应用到所有幻灯片|すべてのスライドに適用しました|모든 슬라이드에 전환 적용됨
Đã xuất GIF|GIF exported|已导出 GIF|GIF をエクスポートしました|GIF 내보냄
Đang chuẩn bị bản in…|Preparing to print…|正在准备打印…|印刷の準備中…|인쇄 준비 중…
Đang dựng PDF…|Building PDF…|正在生成 PDF…|PDF を作成中…|PDF 만드는 중…
Đang lưu…|Saving…|正在保存…|保存中…|저장 중…
Đang tạo GIF động…|Creating animated GIF…|正在生成 GIF 动画…|GIF を作成中…|GIF 만드는 중…
Đang tạo ảnh…|Generating picture…|正在生成图片…|画像を生成中…|이미지 생성 중…
AI đang viết dàn ý… (xem tiến trình trong chat của app)|AI is writing the outline… (watch it in the app's chat)|AI 正在撰写大纲…（可在应用聊天中查看）|AI がアウトラインを作成中… (アプリのチャットで確認)|AI가 개요 작성 중… (앱 채팅에서 확인)
AI đang viết…|AI is writing…|AI 正在撰写…|AI が作成中…|AI가 작성 중…
AI đang viết ghi chú…|AI is writing notes…|AI 正在撰写备注…|AI がノートを作成中…|AI가 노트 작성 중…
AI đang xử lý…|AI is working…|AI 正在处理…|AI が処理中…|AI가 처리 중…
AI đang tóm tắt…|AI is summarizing…|AI 正在总结…|AI が要約中…|AI가 요약 중…
Đã thêm.|Added.|已添加。|追加しました。|추가됨.
Xong|Done|完成|完了|완료
Lỗi|Error|错误|エラー|오류
Lỗi AI|AI error|AI 错误|AI エラー|AI 오류
Lưu lỗi|Save failed|保存失败|保存に失敗|저장 실패
Không mở được|Could not open|无法打开|開けませんでした|열 수 없음
Nhận xét cho slide này:|Comment on this slide:|此幻灯片的批注：|このスライドへのコメント:|이 슬라이드 메모:
Tên phần:|Section name:|节名称：|セクション名:|구역 이름:
Phần mới|New Section|新节|新しいセクション|새 구역
Phần mặc định|Default Section|默认节|既定のセクション|기본 구역
Số hàng:|Rows:|行数：|行数:|행 수:
Số cột:|Columns:|列数：|列数:|열 수:
Địa chỉ liên kết (https://…):|Link address (https://…):|链接地址 (https://…)：|リンク先 (https://…):|링크 주소 (https://…):
Dán đường link ảnh (https://…):|Paste picture link (https://…):|粘贴图片链接 (https://…)：|画像のリンクを貼り付け (https://…):|그림 링크 붙여넣기 (https://…):
Văn bản thay thế (cho người dùng trình đọc màn hình):|Alt text (for screen reader users):|替换文字（供屏幕阅读器使用）：|代替テキスト (スクリーン リーダー用):|대체 텍스트(화면 읽기 프로그램용):
Rộng x Cao (inch):|Width x Height (inches):|宽 x 高（英寸）：|幅 x 高さ (インチ):|너비 x 높이(인치):
Cắt (%) trái, trên, phải, dưới:|Crop (%) left, top, right, bottom:|裁剪 (%) 左、上、右、下：|トリミング (%) 左・上・右・下:|자르기(%) 왼쪽, 위, 오른쪽, 아래:
Lưu thời gian từng slide để tự chuyển khi trình chiếu?|Keep the slide timings for the slide show?|保留幻灯片计时以用于放映？|スライド ショーにタイミングを保存しますか?|쇼에 슬라이드 시간을 저장할까요?
Tổng thời gian|Total time|总时间|合計時間|총 시간
tổng|total|总计|合計|총
Bản trình chiếu 1|Presentation 1|演示文稿1|プレゼンテーション 1|프레젠테이션 1
Bản trình chiếu|Presentation|演示文稿|プレゼンテーション|프레젠테이션
Tiêu đề biểu đồ|Chart Title|图表标题|グラフ タイトル|차트 제목
Chuỗi 1|Series 1|系列 1|系列 1|계열 1
Chuỗi 2|Series 2|系列 2|系列 2|계열 2
Chuỗi 3|Series 3|系列 3|系列 3|계열 3
Chữ nghệ thuật|Your text here|请在此放置您的文字|ここに文字を入力|여기에 텍스트 입력
Cột|Column|列|列|열
Đã tự lưu|Auto-saved|已自动保存|自動保存済み|자동 저장됨
Đã lưu|Saved|已保存|保存済み|저장됨
Đang mở|Opening|正在打开|開いています|여는 중
Đã xuất|Exported|已导出|エクスポートしました|내보냄
ảnh|images|张图片|枚の画像|개 이미지
Đã sao chép|Copied|已复制|コピーしました|복사됨
đối tượng|objects|个对象|個のオブジェクト|개 개체
Đã thay|Replaced|已替换|置換しました|바꿈
chỗ|occurrences|处|件|곳
AI đã tạo|AI created|AI 已生成|AI が作成|AI가 만든
Xong · còn|Done · left|完成 · 剩余|完了 · 残り|완료 · 남음
% hạn mức|% quota|% 配额|% の上限|% 할당량
Đã thêm|Added|已添加|追加しました|추가됨
Hộp|Box|框|ボックス|상자
Cột|Columns|栏|段組み|단
Tìm|Find|查找|検索|찾기
Xoá|Clear|清除|クリア|지우기
thuyết minh|Narration|旁白|ナレーション|내레이션
Chèn|Insert|插入|挿入|삽입
âm thanh|Audio|音频|オーディオ|오디오
Thuyết minh|Narration|旁白|ナレーション|내레이션
Đã xoá thuyết minh|Narration cleared|已清除旁白|ナレーションを削除しました|내레이션을 지웠습니다
🎙 Đang ghi — nói thuyết minh cho từng slide, bấm → để sang slide, Esc để kết thúc|🎙 Recording — narrate each slide, press → for the next slide, Esc to finish|🎙 正在录制——为每张幻灯片讲解，按 → 翻页，Esc 结束|🎙 録音中 — 各スライドを説明し、→ で次へ、Esc で終了|🎙 녹음 중 — 슬라이드마다 설명하고 → 로 다음, Esc 로 종료
Phông chữ|Font|字体|フォント|글꼴
Đoạn văn|Paragraph|段落|段落|단락
Bảng tạm|Clipboard|剪贴板|クリップボード|클립보드
Chủ đề|Themes|主题|テーマ|테마`;
  const L = ['vi', 'en', 'zh', 'ja', 'ko'];
  const DICT = {}; for (const line of RAW.split('\n')) { const p = line.split('|'); if (p.length < 5) continue; if (!DICT[p[0]]) DICT[p[0]] = p; }
  const KEYS = Object.keys(DICT).filter((k) => k.length >= 3).sort((a, b) => b.length - a.length);
  S.lang = 'vi';
  const pick = (loc) => { const l = String(loc || '').toLowerCase().split(/[-_]/)[0]; return L.includes(l) ? l : 'en'; };
  S.T = (vi) => { if (S.lang === 'vi' || vi == null) return vi; const s = String(vi); const row = DICT[s.trim()]; if (row) { const t = row[L.indexOf(S.lang)]; return t ? s.replace(s.trim(), t) : s; }
    let out = s; for (const k of KEYS) if (out.includes(k)) { const t = DICT[k][L.indexOf(S.lang)]; if (t) out = out.split(k).join(t); } return out; };
  // translate the chrome — never the user's slide content (.sl) except placeholder hints
  const skip = (n) => { const e = n.nodeType === 1 ? n : n.parentElement; if (!e) return true; if (e.closest('.ph-hint')) return false; return !!e.closest('.sl, [contenteditable="true"], #dsTitle, #dsNotes, textarea, input, select option[value]:not([data-i18n]), .ds-th .box, [data-pv], .pv'); };
  const ATTR = ['title', 'placeholder', 'data-ph', 'aria-label'];
  function tr(root) {
    if (S.lang === 'vi' || !root) return;
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT); let n; const list = []; while ((n = w.nextNode())) list.push(n);
    for (const t of list) { if (!/[A-Za-zÀ-ỹ]/.test(t.nodeValue) || skip(t)) continue; const v = S.T(t.nodeValue); if (v !== t.nodeValue) t.nodeValue = v; }
    const els = root.nodeType === 1 ? [root, ...root.querySelectorAll('[title],[placeholder],[data-ph],[aria-label]')] : [];
    for (const e of els) { if (e.closest('.sl')) continue; for (const a of ATTR) { const v = e.getAttribute?.(a); if (v) { const t = S.T(v); if (t !== v) e.setAttribute(a, t); } } }
  }
  S.translate = tr;
  let mo; function watch() { mo?.disconnect(); if (S.lang === 'vi') return; mo = new MutationObserver((ms) => { mo.disconnect(); for (const m of ms) { if (m.type === 'characterData') tr(m.target.parentElement); else m.addedNodes.forEach((x) => (x.nodeType === 3 ? tr(x.parentElement) : tr(x))); } mo.observe(document.body, { childList: true, subtree: true }); }); tr(document.body); mo.observe(document.body, { childList: true, subtree: true }); }
  // dialogs and toasts show text before it reaches the DOM observer
  const _p = window.prompt.bind(window), _c = window.confirm.bind(window);
  window.prompt = (m, d) => _p(S.T(m), d); window.confirm = (m) => _c(S.T(m));
  S.setLang = (loc) => { const l = pick(loc); const changed = l !== S.lang; S.lang = l; document.documentElement.lang = l; if (changed && S.renderAll && document.getElementById("ds")) { try { S.renderAll(); } catch (e) { console.error(e); } } watch(); };
  S.initLang = () => {
    S.setLang(window.aicw?.locale || document.documentElement.lang || navigator.language);
    try { aicw.on('init', (m) => S.setLang(m?.locale || aicw.locale)); } catch {}
    // the host sends a fresh init when its language changes; also poll cheaply in case only aicw.locale moves
    setInterval(() => { const l = pick(window.aicw?.locale); if (l !== S.lang && window.aicw?.locale) S.setLang(l); }, 1500);
  };
})();
