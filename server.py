import os
import traceback
from flask import Flask, request, jsonify, make_response
from flask_cors import CORS
import firebase_admin
from firebase_admin import credentials, firestore
from docxtpl import DocxTemplate
from io import BytesIO
from datetime import datetime, timedelta

app = Flask(__name__)

CORS(app, resources={
    r"/*": {
        "origins": [
            "https://contech-dc-dashboard.vercel.app",
            "http://localhost:5173",
            "http://localhost:3000",
            "*"  # أضيف * للتطوير والاختبار
        ],
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization", "Accept"],
        "supports_credentials": True,
        "expose_headers": ["Content-Disposition"]
    }
})

# تحديد المسارات
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
SERVICE_ACCOUNT_PATH = os.path.join(BASE_DIR, "serviceAccountKey.json")

# تهيئة Firebase
if not firebase_admin._apps:
    if os.path.exists(SERVICE_ACCOUNT_PATH):
        cred = credentials.Certificate(SERVICE_ACCOUNT_PATH)
        firebase_admin.initialize_app(cred)
    else:
        print(f"⚠️ WARNING: Service account file not found at {SERVICE_ACCOUNT_PATH}")
        # إنشاء تطبيق بدون بيانات اعتماد (للتطوير فقط)
        firebase_admin.initialize_app(credential=credentials.ApplicationDefault())

db = firestore.client()
EGYPT_TZ = timedelta(hours=2)

# =============================================
# 🔧 FUNCTIONS المساعدات
# =============================================

def get_now_str():
    """الحصول على التاريخ والوقت الحالي بتنسيق مناسب"""
    now = datetime.utcnow() + EGYPT_TZ
    return now.strftime("%d-%b-%y %I:%M %p")

def get_date_str():
    """الحصول على التاريخ فقط"""
    now = datetime.utcnow() + EGYPT_TZ
    return now.strftime("%d %b %Y")  # تغيير التنسيق ليتوافق مع Word

def generate_ir_no(project, dept_abbr, counter, request_type):
    """توليد رقم IR"""
    clean_project = project.replace(" ", "-").upper()
    
    if request_type == "CPR":
        return f"BADYA-CON-{clean_project}-CPR-{counter:03d}"
    else:
        return f"BADYA-CON-{clean_project}-IR-{dept_abbr}-{counter:03d}"

def normalize_dept_for_ir(department):
    """تطبيع اسم القسم للحصول على الاختصار الموحد لرقم IR"""
    if not department:
        return "ST"  # القسم الافتراضي

    dept = department.upper().strip()

    if "ARCH" in dept or "معماري" in dept or "ARCHITECTURAL" in dept:
        return "ARCH"
    elif "CIVIL" in dept or "STRUCT" in dept or "إنشائي" in dept:
        return "ST"
    elif "ELECT" in dept or "كهرباء" in dept or "ELECTRICAL" in dept:
        return "ELECT"
    elif "MEP" in dept or "MECH" in dept or "ميكانيكا" in dept or "MECHANICAL" in dept:
        return "MECH"
    elif "SURV" in dept or "مساحة" in dept or "SURVEY" in dept:
        return "SURV"
    else:
        return "ST"  # الافتراضي

def normalize_dept_for_firebase(department):
    """تطبيع اسم القسم للحصول على اسم المستند في Firebase"""
    if not department:
        return "Architectural"  # القسم الافتراضي بناءً على بياناتك

    dept = department.strip()
    
    # التحقق من الأسماء بدقة كما هي في Firebase
    if dept == "Architectural":
        return "Architectural"
    elif dept == "Civil":
        return "Civil"
    elif dept == "Electrical":
        return "Electrical"
    elif dept == "Mechanical":
        return "Mechanical"
    elif dept == "Survey":
        return "Survey"
    
    # إذا كانت اختصارات أو أسماء مختلفة
    dept_upper = dept.upper()
    
    if "ARCH" in dept_upper:
        return "Architectural"
    elif "CIVIL" in dept_upper or "STRUCT" in dept_upper:
        return "Civil"
    elif "ELECT" in dept_upper:
        return "Electrical"
    elif "MEP" in dept_upper or "MECH" in dept_upper:
        return "Mechanical"
    elif "SURV" in dept_upper:
        return "Survey"
    else:
        return "Architectural"  # الافتراضي بناءً على بياناتك

# =============================================
# 🔐 ROUTES: USERS & AUTH
# =============================================

@app.route('/login', methods=['POST'])
def login():
    """تسجيل الدخول"""
    try:
        data = request.json
        if not data:
            return jsonify({"error": "No data provided"}), 400

        username = data.get("username", "").lower().strip()
        password = data.get("password", "").strip()

        if not username or not password:
            return jsonify({"error": "Username and password are required"}), 400

        user_doc = db.collection("users").document(username).get()

        if user_doc.exists:
            user_data = user_doc.to_dict()
            if user_data.get("password") == password:
                # إزالة كلمة المرور من البيانات المعادة
                user_data.pop("password", None)
                return jsonify({
                    "success": True,
                    "user": user_data
                })

        return jsonify({"error": "Invalid credentials"}), 401

    except Exception as e:
        print(f"❌ Login error: {str(e)}")
        traceback.print_exc()
        return jsonify({"error": f"Login failed: {str(e)}"}), 500
        
        
        
        # =============================================
# 👥 ROUTES: USERS MANAGEMENT
# =============================================

@app.route('/users', methods=['GET'])
def get_users():
    """جلب جميع المستخدمين"""
    try:
        docs = db.collection("users").stream()
        users_list = []

        for doc in docs:
            data = doc.to_dict()
            # إزالة كلمة المرور لأسباب أمنية
            data.pop("password", None)
            data["username"] = doc.id
            users_list.append(data)

        return jsonify({"users": users_list})

    except Exception as e:
        print(f"❌ Get users error: {str(e)}")
        return jsonify({"error": f"Failed to load users: {str(e)}"}), 500

@app.route('/users', methods=['POST'])
def create_or_update_user():
    """إنشاء أو تحديث مستخدم"""
    try:
        data = request.json
        print(f"📥 User operation request: {data}")

        if not data:
            return jsonify({"error": "No data provided"}), 400

        username = data.get("username", "").strip().lower()
        
        if not username:
            return jsonify({"error": "Username is required"}), 400

        user_ref = db.collection("users").document(username)
        
        # إعداد بيانات المستخدم
        user_data = {
            "username": username,
            "fullname": data.get("fullname", ""),
            "department": data.get("department", "ST"),
            "role": data.get("role", "engineer"),
            "updatedAt": get_now_str()
        }

        # إذا كان هناك كلمة مرور، إضافتها
        if data.get("password"):
            user_data["password"] = data.get("password")

        # إذا كان مستخدم جديد، إضافة createdAt
        if not user_ref.get().exists:
            user_data["createdAt"] = get_now_str()
            user_data["lastLogin"] = None
            message = "User created successfully"
        else:
            message = "User updated successfully"

        user_ref.set(user_data, merge=True)
        print(f"✅ User operation completed: {username}")

        return jsonify({
            "success": True,
            "message": message,
            "user": {
                "username": username,
                "fullname": user_data["fullname"],
                "department": user_data["department"],
                "role": user_data["role"]
            }
        })

    except Exception as e:
        print(f"❌ User operation error: {str(e)}")
        traceback.print_exc()
        return jsonify({"error": f"User operation failed: {str(e)}"}), 500

@app.route('/users/<username>', methods=['DELETE'])
def delete_user(username):
    """حذف مستخدم"""
    try:
        if not username:
            return jsonify({"error": "Username is required"}), 400

        user_ref = db.collection("users").document(username.lower())
        
        if not user_ref.get().exists:
            return jsonify({"error": f"User {username} not found"}), 404

        user_ref.delete()
        print(f"✅ User deleted: {username}")

        return jsonify({
            "success": True,
            "message": f"User {username} deleted successfully"
        })

    except Exception as e:
        print(f"❌ Delete user error: {str(e)}")
        traceback.print_exc()
        return jsonify({"error": f"Failed to delete user: {str(e)}"}), 500

# =============================================
# 📋 DESCRIPTIONS ROUTES (NEW)
# =============================================

@app.route('/general-descriptions', methods=['GET'])
def get_general_descriptions():
    """جلب الأوصاف العامة حسب المشروع والقسم"""
    try:
        project = request.args.get("project", "").strip()
        dept = request.args.get("dept", "").strip()
        request_type = request.args.get("requestType", "IR").upper()

        print(f"📥 Getting descriptions for: project='{project}', dept='{dept}', type={request_type}")
        print(f"   Raw department parameter: '{dept}'")

        # ✅ استخدام الدالة الصحيحة للبحث في Firebase
        firebase_dept_name = normalize_dept_for_firebase(dept)
        print(f"   Normalized Firebase document name: '{firebase_dept_name}'")
        
        # ✅ تحديد المجموعة بناءً على نوع الطلب
        if request_type == "CPR":
            collection_name = "general_descriptions_cpr"
            # CPR يستخدم فقط "Civil" حتى لو كان القسم Architectural
            if firebase_dept_name != "Civil":
                print(f"⚠️ CPR can only use Civil department. Using 'Civil' instead of '{firebase_dept_name}'")
                firebase_dept_name = "Civil"
        else:
            collection_name = "general_descriptions"

        print(f"🔍 Looking in Firebase: collection='{collection_name}', document='{firebase_dept_name}'")
        
        # ✅ عرض جميع المستندات المتاحة للمساعدة في التصحيح
        try:
            docs = db.collection(collection_name).stream()
            available_docs = [doc.id for doc in docs]
            print(f"   Available documents in '{collection_name}': {available_docs}")
        except Exception as list_error:
            print(f"⚠️ Could not list documents: {list_error}")

        # محاولة جلب البيانات من Firebase
        doc_ref = db.collection(collection_name).document(firebase_dept_name)
        doc = doc_ref.get()

        # ✅ تهيئة response مع قيم افتراضية
        response_data = {
            "base": [],
            "floors": ["Basement", "Ground Floor", "1st Floor", "2nd Floor", "3rd Floor", "Roof"]  # الافتراضي
        }

        if doc.exists:
            data = doc.to_dict()
            print(f"✅ Found data in Firebase for '{firebase_dept_name}'")
            print(f"   Available fields in document: {list(data.keys())}")

            # ✅ استخراج بيانات base (إذا كانت موجودة)
            if "base" in data and isinstance(data["base"], list):
                response_data["base"] = data["base"]
                print(f"   Found {len(data['base'])} base items")
                print(f"   First 5 base items: {data['base'][:5]}")
            else:
                print(f"⚠️ No 'base' field found or not an array")

            # ✅ استخراج بيانات floors (إذا كانت موجودة)
            if "floors" in data and isinstance(data["floors"], list):
                response_data["floors"] = data["floors"]
                print(f"   Found {len(data['floors'])} floor items")
                print(f"   First 5 floor items: {data['floors'][:5]}")
            else:
                print(f"⚠️ No 'floors' field found or not an array, using defaults")

            # ✅ إضافة حقول إضافية لـ CPR
            if request_type == "CPR":
                if "elements" in data and isinstance(data["elements"], list):
                    response_data["elements"] = data["elements"]
                    print(f"   Found {len(data['elements'])} elements")

                if "grades" in data and isinstance(data["grades"], list):
                    response_data["grades"] = data["grades"]
                    print(f"   Found {len(data['grades'])} grades")
        else:
            print(f"❌ ERROR: Document '{firebase_dept_name}' not found in collection '{collection_name}'")
            print(f"   Make sure the document exists in Firebase")
            
            # ❌ إرجاع قوائم فارغة بدلاً من بيانات ثابتة
            response_data["base"] = []
            response_data["floors"] = []
            
            # إضافة رسالة خطأ للمساعدة في التصحيح
            response_data["error"] = f"Document '{firebase_dept_name}' not found in collection '{collection_name}'"
            response_data["debug_info"] = {
                "collection": collection_name,
                "document_requested": firebase_dept_name,
                "original_department": dept,
                "normalized_department": firebase_dept_name,
                "request_type": request_type
            }
            
            if request_type == "CPR":
                response_data["elements"] = []
                response_data["grades"] = []

        print(f"✅ Returning {len(response_data['base'])} base items and {len(response_data['floors'])} floor items")
        print(f"   Response structure: {list(response_data.keys())}")
        
        return jsonify(response_data)

    except Exception as e:
        print(f"❌ Error in get_general_descriptions: {str(e)}")
        traceback.print_exc()
        return jsonify({
            "base": [],
            "floors": [],
            "error": str(e),
            "debug": "Server error occurred"
        }), 500

# =============================================
# 📄 ROUTES: IRS (Inspection Requests)
# =============================================

@app.route('/irs', methods=['GET'])
def get_irs():
    """جلب جميع طلبات التفتيش"""
    try:
        docs = db.collection("irs").stream()
        irs_list = []

        for doc in docs:
            data = doc.to_dict()
            data["id"] = doc.id
            irs_list.append(data)

        return jsonify({"irs": irs_list})

    except Exception as e:
        print(f"❌ Get IRS error: {str(e)}")
        return jsonify({"error": f"Failed to load IRS: {str(e)}"}), 500

@app.route('/irs', methods=['POST'])
def create_ir():
    """إنشاء طلب تفتيش جديد"""
    try:
        data = request.json
        print(f"📥 Received IR data: {data}")

        if not data:
            return jsonify({"error": "No data provided"}), 400

        # التحقق من الحقول المطلوبة
        required_fields = ["project", "department", "user", "desc"]
        missing_fields = [field for field in required_fields if not data.get(field)]
        if missing_fields:
            return jsonify({"error": f"Missing required fields: {', '.join(missing_fields)}"}), 400

        project = data.get("project", "").strip()
        department = data.get("department", "").strip()
        user = data.get("user", "").strip()
        request_type = data.get("requestType", "IR").upper()

        print(f"🔧 Processing IR creation:")
        print(f"   Project: {project}")
        print(f"   Department: {department}")
        print(f"   User: {user}")
        print(f"   Request Type: {request_type}")

        # ✅ تطبيع القسم لأرقام IR
        dept_abbr = normalize_dept_for_ir(department)

        # التحقق من أن CPR فقط للقسم الإنشائي
        if request_type == "CPR" and dept_abbr != "ST":
            return jsonify({"error": "CPR requests are only available for Civil/Structure department"}), 400

        # ✅ الحصول على المشروع وتحديث العداد من projects collection
        project_ref = db.collection("projects").document(project)
        project_doc = project_ref.get()

        if not project_doc.exists:
            # إنشاء المشروع مع العدادات الأولية
            project_ref.set({
                "name": project,
                "counters": {
                    "ARCH": 0,
                    "ST": 0,
                    "MECH": 0,
                    "ELECT": 0,
                    "SURV": 0,
                    "CPR": 0
                },
                "createdAt": get_now_str(),
                "updatedAt": get_now_str()
            })
            print(f"✅ Created new project {project}")
            counters = {"ARCH": 0, "ST": 0, "MECH": 0, "ELECT": 0, "SURV": 0, "CPR": 0}
        else:
            # جلب العدادات الحالية
            project_data = project_doc.to_dict()
            counters = project_data.get("counters", {"ARCH": 0, "ST": 0, "MECH": 0, "ELECT": 0, "SURV": 0, "CPR": 0})

        # ✅ تحديد مفتاح العداد بناءً على نوع الطلب والقسم
        if request_type == "CPR":
            counter_key = "CPR"
        else:
            counter_key = dept_abbr

        # ✅ الحصول على القيمة الحالية وزيادتها
        current_counter = counters.get(counter_key, 0) + 1

        # ✅ تحديث العداد في المشروع
        counters[counter_key] = current_counter
        project_ref.update({
            "counters": counters,
            "updatedAt": get_now_str()
        })

        print(f"✅ Updated counter for {counter_key} to {current_counter}")

        # ✅ توليد رقم IR باستخدام العداد من projects
        ir_no = generate_ir_no(project, dept_abbr, current_counter, request_type)
        print(f"✅ Generated IR No: {ir_no} (from project counter)")

        # إنشاء بيانات IR
        ir_data = {
            "irNo": ir_no,
            "project": project,
            "department": department,
            "deptAbbr": dept_abbr,
            "user": user,
            "desc": data.get("desc", ""),
            "location": data.get("location", ""),
            "floor": data.get("floor", ""),
            "sentAt": get_now_str(),
            "requestType": request_type,
            "isDone": False,
            "isArchived": False,
            "archivedAt": None,
            "archivedBy": None,
            "tags": data.get("tags", {}),
            "engineerNote": data.get("engineerNote", ""),
            "sdNote": data.get("sdNote", ""),
            "status": "pending",
            "createdAt": get_now_str(),
            "updatedAt": get_now_str(),
            "createdBy": user
        }

        # إضافة حقول CPR إذا كان CPR
        if request_type == "CPR":
            ir_data["concreteGrade"] = data.get("concreteGrade", "")
            ir_data["pouringElement"] = data.get("pouringElement", "")

        # حفظ IR في قاعدة البيانات
        db.collection("irs").document(ir_no).set(ir_data)
        print(f"✅ Saved IR to database: {ir_no}")

        return jsonify({
            "success": True,
            "ir": ir_data,
            "message": f"{request_type} created successfully",
            "counter": current_counter
        })

    except Exception as e:
        print(f"❌ Create IR error: {str(e)}")
        traceback.print_exc()
        return jsonify({"error": f"Failed to create IR: {str(e)}"}), 500

@app.route('/irs/mark-done', methods=['POST'])
def mark_ir_done():
    """تحديد IR كمكتمل"""
    try:
        data = request.json
        if not data:
            return jsonify({"error": "No data provided"}), 400

        ir_no = data.get("irNo", "").strip()

        if not ir_no:
            return jsonify({"error": "IR number is required"}), 400

        # التحقق من وجود IR
        ir_doc = db.collection("irs").document(ir_no).get()
        if not ir_doc.exists:
            return jsonify({"error": f"IR {ir_no} not found"}), 404

        update_data = {
            "isDone": True,
            "completedAt": get_now_str(),
            "downloadedBy": data.get("downloadedBy", ""),
            "downloadedAt": get_now_str(),
            "updatedAt": get_now_str(),
            "status": "completed"
        }

        db.collection("irs").document(ir_no).update(update_data)

        print(f"✅ Marked IR {ir_no} as done")

        return jsonify({
            "success": True,
            "message": f"IR {ir_no} marked as done"
        })

    except Exception as e:
        print(f"❌ Mark IR done error: {str(e)}")
        return jsonify({"error": f"Failed to mark IR as done: {str(e)}"}), 500

@app.route('/irs/update-ir-number', methods=['POST'])
def update_ir_number():
    """تحديث رقم IR مع تحديث العداد في المشروع"""
    try:
        data = request.json
        print(f"📥 Update IR number request: {data}")

        if not data:
            return jsonify({"error": "No data provided"}), 400

        old_ir_no = data.get("irNo", "").strip()
        new_serial = int(data.get("newSerial", 0))
        project = data.get("project", "").strip()
        department = data.get("department", "").strip()
        request_type = data.get("requestType", "IR").upper()

        if not old_ir_no or new_serial < 1:
            return jsonify({"error": "Invalid IR number or serial"}), 400

        # التحقق من وجود IR القديم
        old_ir_doc = db.collection("irs").document(old_ir_no).get()
        if not old_ir_doc.exists:
            return jsonify({"error": f"IR {old_ir_no} not found"}), 404

        old_ir_data = old_ir_doc.to_dict()
        
        # ✅ تطبيع القسم
        dept_abbr = normalize_dept_for_ir(department)
        
        # ✅ توليد رقم IR جديد
        new_ir_no = generate_ir_no(project, dept_abbr, new_serial, request_type)
        
        # ✅ تحديث العداد في المشروع إذا كان الرقم الجديد أكبر من الحالي
        project_ref = db.collection("projects").document(project)
        project_doc = project_ref.get()
        
        if project_doc.exists:
            project_data = project_doc.to_dict()
            counters = project_data.get("counters", {})
            
            counter_key = "CPR" if request_type == "CPR" else dept_abbr
            
            # تحديث العداد إذا كان الرقم الجديد أكبر
            current_counter = counters.get(counter_key, 0)
            if new_serial > current_counter:
                counters[counter_key] = new_serial
                project_ref.update({
                    "counters": counters,
                    "updatedAt": get_now_str()
                })
                print(f"✅ Updated project counter for {counter_key} to {new_serial}")

        # ✅ تحديث بيانات IR
        updated_data = {
            **old_ir_data,
            "irNo": new_ir_no,
            "oldIrNo": old_ir_no,
            "updatedAt": get_now_str()
        }

        # ✅ حفظ النسخة الجديدة وحذف القديمة
        db.collection("irs").document(new_ir_no).set(updated_data)
        db.collection("irs").document(old_ir_no).delete()
        
        print(f"✅ Updated IR number from {old_ir_no} to {new_ir_no}")

        return jsonify({
            "success": True,
            "oldIrNo": old_ir_no,
            "newIrNo": new_ir_no,
            "message": f"IR number updated successfully"
        })

    except Exception as e:
        print(f"❌ Update IR number error: {str(e)}")
        traceback.print_exc()
        return jsonify({"error": f"Failed to update IR number: {str(e)}"}), 500

# =============================================
# 🗑️ ROUTES: DELETE OPERATIONS
# =============================================

@app.route('/irs/delete', methods=['POST'])
def delete_ir():
    """حذف IR من الأرشيف"""
    try:
        data = request.json
        print(f"🗑️ Delete IR request: {data}")

        if not data:
            return jsonify({"error": "No data provided"}), 400

        ir_no = data.get("irNo", "").strip()
        role = data.get("role", "").strip()

        if not ir_no:
            return jsonify({"error": "IR number is required"}), 400

        print(f"🔍 Looking for IR to delete: {ir_no}")

        # البحث في archive_irs أولاً
        doc_ref = db.collection("archive_irs").document(ir_no)
        doc = doc_ref.get()

        if doc.exists:
            # حذف من الأرشيف
            doc_ref.delete()
            print(f"✅ Deleted IR from archive_irs: {ir_no}")
            return jsonify({
                "success": True,
                "message": f"IR {ir_no} deleted from archive",
                "deletedFrom": "archive"
            })

        # إذا لم يكن في الأرشيف، البحث في IRS العادية
        doc_ref = db.collection("irs").document(ir_no)
        doc = doc_ref.get()

        if doc.exists:
            # حذف من IRS العادية
            doc_ref.delete()
            print(f"✅ Deleted IR from active irs: {ir_no}")
            return jsonify({
                "success": True,
                "message": f"IR {ir_no} deleted",
                "deletedFrom": "active"
            })

        return jsonify({"error": f"IR {ir_no} not found"}), 404

    except Exception as e:
        print(f"❌ Delete IR error: {str(e)}")
        traceback.print_exc()
        return jsonify({"error": f"Failed to delete IR: {str(e)}"}), 500



@app.route('/revs/delete', methods=['POST'])
def delete_rev():
    """حذف Revision من الأرشيف"""
    try:
        data = request.json
        print(f"🗑️ Delete Revision request: {data}")

        if not data:
            return jsonify({"error": "No data provided"}), 400

        rev_no = data.get("revNo", "").strip()
        role = data.get("role", "").strip()

        if not rev_no:
            return jsonify({"error": "Revision number is required"}), 400

        print(f"🔍 Looking for Revision to delete: {rev_no}")

        # البحث في archive_revs أولاً
        doc_ref = db.collection("archive_revs").document(rev_no)
        doc = doc_ref.get()

        if doc.exists:
            # حذف من الأرشيف
            doc_ref.delete()
            print(f"✅ Deleted Revision from archive_revs: {rev_no}")
            return jsonify({
                "success": True,
                "message": f"Revision {rev_no} deleted from archive",
                "deletedFrom": "archive"
            })

        # إذا لم يكن في الأرشيف، البحث في Revisions العادية
        doc_ref = db.collection("revs").document(rev_no)
        doc = doc_ref.get()

        if doc.exists:
            # حذف من Revisions العادية
            doc_ref.delete()
            print(f"✅ Deleted Revision from active revs: {rev_no}")
            return jsonify({
                "success": True,
                "message": f"Revision {rev_no} deleted",
                "deletedFrom": "active"
            })

        return jsonify({"error": f"Revision {rev_no} not found"}), 404

    except Exception as e:
        print(f"❌ Delete Revision error: {str(e)}")
        traceback.print_exc()
        return jsonify({"error": f"Failed to delete Revision: {str(e)}"}), 500

# =============================================
# 🔄 ROUTES: REVISIONS
# =============================================

@app.route('/revs', methods=['GET'])
def get_revs():
    """جلب جميع المراجعات"""
    try:
        docs = db.collection("revs").stream()
        revs_list = []

        for doc in docs:
            data = doc.to_dict()
            data["id"] = doc.id
            revs_list.append(data)

        return jsonify({"revs": revs_list})

    except Exception as e:
        print(f"❌ Get revs error: {str(e)}")
        return jsonify({"error": f"Failed to load revisions: {str(e)}"}), 500

@app.route('/revs', methods=['POST'])
def handle_revs():
    """إنشاء مراجعة جديدة"""
    try:
        data = request.json
        print(f"📥 Received revision data: {data}")

        if not data:
            return jsonify({"error": "No data provided"}), 400

        project = data.get("project", "").strip()
        user_rev_number = data.get("revText", "").strip()
        rev_note = data.get("revNote", "")
        revision_type = data.get("revisionType", "IR_REVISION")
        parent_request_type = data.get("parentRequestType", "IR")
        department = data.get("department", "").strip()
        user = data.get("user", "").strip()

        if not project or not user_rev_number:
            return jsonify({"error": "Project and revision number are required"}), 400
        if not department or not user:
            return jsonify({"error": "Department and user are required"}), 400

        print(f"🔧 Processing revision creation:")
        print(f"   Project: {project}")
        print(f"   Revision Number: {user_rev_number}")
        print(f"   Department: {department}")
        print(f"   User: {user}")
        print(f"   Type: {revision_type}")

        # استخدام عداد منفصل حسب نوع المراجعة
        counter_key = f"rev_counter_{revision_type.lower()}"
        rev_counter_ref = db.collection("rev_counters").document(f"{project}_{counter_key}")

        rev_counter_doc = rev_counter_ref.get()

        if rev_counter_doc.exists:
            counter_data = rev_counter_doc.to_dict()
            current_count = counter_data.get("counter", 0) + 1
        else:
            current_count = 1

        # تحديث العداد المناسب
        rev_counter_ref.set({
            "counter": current_count,
            "project": project,
            "revision_type": revision_type,
            "last_updated": get_now_str()
        }, merge=True)

        # توليد رقم REV مع إضافة نوع المراجعة
        clean_project = project.replace(" ", "-").upper()
        clean_rev_type = "IRREV" if revision_type == "IR_REVISION" else "CPRREV"
        rev_no = f"REV-{clean_project}-{clean_rev_type}-{current_count:03d}"

        # إنشاء وصف كامل
        rev_prefix = "REV-IR" if revision_type == "IR_REVISION" else "REV-CPR"
        display_number = f"{rev_prefix}-{user_rev_number}"

        display_description = f"{rev_prefix}: {user_rev_number}"
        if rev_note:
            display_description = f"{rev_prefix}: {user_rev_number} - {rev_note}"

        # بيانات المراجعة الكاملة
        rev_data = {
            "revNo": rev_no,
            "irNo": rev_no,
            "userRevNumber": user_rev_number,
            "revText": user_rev_number,
            "revNumber": user_rev_number,
            "displayNumber": display_number,
            "revNote": rev_note,
            "desc": display_description,
            "department": department,
            "user": user,
            "project": project,
            "sentAt": get_now_str(),
            "isRevision": True,
            "isDone": False,
            "isArchived": False,
            "revisionType": revision_type,
            "parentRequestType": parent_request_type,
            "requestType": parent_request_type,
            "isCPRRevision": revision_type == "CPR_REVISION",
            "isIRRevision": revision_type == "IR_REVISION",
            "archivedAt": None,
            "archivedBy": None,
            "archivedByDC": False,
            "archivedByEngineer": False,
            "status": "pending",
            "createdAt": get_now_str(),
            "updatedAt": get_now_str(),
            "createdBy": user,
            "version": "2.0",
            "isActive": True,
            "counter": current_count,
            "counterType": counter_key
        }

        # حفظ المراجعة
        db.collection("revs").document(rev_no).set(rev_data)
        print(f"✅ Created revision: {rev_no}")

        return jsonify({
            "success": True,
            "rev": rev_data,
            "message": f"{revision_type} created successfully"
        })

    except Exception as e:
        print(f"❌ Create revision error: {str(e)}")
        traceback.print_exc()
        return jsonify({"error": f"Failed to create revision: {str(e)}"}), 500

@app.route('/revs/mark-done', methods=['POST'])
def mark_rev_done():
    """تحديد Revision كمكتمل"""
    try:
        data = request.json
        if not data:
            return jsonify({"error": "No data provided"}), 400

        rev_no = data.get("irNo", "").strip()

        if not rev_no:
            return jsonify({"error": "Revision number is required"}), 400

        # التحقق من وجود المراجعة
        rev_doc = db.collection("revs").document(rev_no).get()
        if not rev_doc.exists:
            return jsonify({"error": f"Revision {rev_no} not found"}), 404

        db.collection("revs").document(rev_no).update({
            "isDone": True,
            "completedAt": get_now_str(),
            "updatedAt": get_now_str(),
            "status": "completed"
        })

        print(f"✅ Marked revision {rev_no} as done")

        return jsonify({
            "success": True,
            "message": f"Revision {rev_no} marked as done"
        })

    except Exception as e:
        print(f"❌ Mark revision done error: {str(e)}")
        return jsonify({"error": f"Failed to mark revision as done: {str(e)}"}), 500

# =============================================
# 📁 ROUTES: ARCHIVE MANAGEMENT
# =============================================

@app.route('/archive', methods=['POST'])
def archive_item():
    """أرشفة عنصر"""
    try:
        data = request.json
        print(f"📥 Archive request: {data}")

        if not data:
            return jsonify({"error": "No data provided"}), 400

        ir_no = data.get("irNo", "").strip()
        role = data.get("role", "").strip().lower()
        is_revision = data.get("isRevision", False)

        if not ir_no or not role:
            return jsonify({"error": "IR number and role are required"}), 400

        print(f"🔧 Archiving item: {ir_no}, Type: {'Revision' if is_revision else 'IR'}, By: {role}")

        # تحديد collection المصدر
        source_coll = "revs" if is_revision else "irs"
        target_coll = "archive_revs" if is_revision else "archive_irs"

        # جلب العنصر
        source_doc = db.collection(source_coll).document(ir_no).get()
        if not source_doc.exists:
            return jsonify({"error": f"Item {ir_no} not found"}), 404

        item_data = source_doc.to_dict()
        print(f"✅ Found item in {source_coll}: {ir_no}")

        # إضافة معلومات الأرشيف
        archive_info = {
            "archivedAt": get_now_str(),
            "archivedBy": role,
            "isArchived": True,
            "updatedAt": get_now_str(),
            "status": "archived"
        }

        if role == "dc":
            archive_info["archivedByDC"] = True
            archive_info["archivedByEngineer"] = False
        else:
            archive_info["archivedByDC"] = False
            archive_info["archivedByEngineer"] = True

        # دمج البيانات الأصلية مع معلومات الأرشيف
        archived_data = {**item_data, **archive_info}

        # نسخ إلى الأرشيف
        db.collection(target_coll).document(ir_no).set(archived_data)
        print(f"✅ Copied to {target_coll}: {ir_no}")

        # حذف من المصدر
        db.collection(source_coll).document(ir_no).delete()
        print(f"✅ Deleted from {source_coll}: {ir_no}")

        return jsonify({
            "success": True,
            "message": f"Item {ir_no} archived successfully",
            "archivedAt": archive_info["archivedAt"]
        })

    except Exception as e:
        print(f"❌ Archive error: {str(e)}")
        traceback.print_exc()
        return jsonify({"error": f"Archive failed: {str(e)}"}), 500

@app.route('/unarchive', methods=['POST'])
def unarchive_item():
    """استعادة عنصر من الأرشيف"""
    try:
        data = request.json
        print(f"📥 Unarchive request: {data}")

        if not data:
            return jsonify({"error": "No data provided"}), 400

        ir_no = data.get("irNo", "").strip()
        role = data.get("role", "").strip().lower()
        is_revision = data.get("isRevision", False)

        if not ir_no:
            return jsonify({"error": "IR number is required"}), 400

        print(f"🔧 Unarchiving item: {ir_no}, Type: {'Revision' if is_revision else 'IR'}")

        # تحديد collection المصدر والهدف
        source_coll = "archive_revs" if is_revision else "archive_irs"
        target_coll = "revs" if is_revision else "irs"

        # جلب العنصر من الأرشيف
        source_doc = db.collection(source_coll).document(ir_no).get()
        if not source_doc.exists:
            return jsonify({"error": f"Item {ir_no} not found in archive"}), 404

        item_data = source_doc.to_dict()
        print(f"✅ Found item in archive: {ir_no}")

        # إزالة معلومات الأرشيف
        fields_to_remove = [
            "archivedAt", "archivedBy", "archivedByDC", "archivedByEngineer",
            "isArchived"
        ]

        for field in fields_to_remove:
            item_data.pop(field, None)

        # تحديث الحقول
        item_data["updatedAt"] = get_now_str()
        item_data["status"] = "pending" if not item_data.get("isDone") else "completed"

        # نسخ إلى المجموعة النشطة
        db.collection(target_coll).document(ir_no).set(item_data)
        print(f"✅ Restored to {target_coll}: {ir_no}")

        # حذف من الأرشيف
        db.collection(source_coll).document(ir_no).delete()
        print(f"✅ Deleted from archive: {ir_no}")

        return jsonify({
            "success": True,
            "message": f"Item {ir_no} restored successfully",
            "item": item_data
        })

    except Exception as e:
        print(f"❌ Unarchive error: {str(e)}")
        traceback.print_exc()
        return jsonify({"error": f"Restore failed: {str(e)}"}), 500

@app.route('/archive/dc', methods=['GET'])
def get_dc_archive():
    """جلب الأرشيف الخاص بالـ DC"""
    try:
        print("📥 Fetching DC archive...")

        # جلب IRs مؤرشفة بواسطة DC
        archive_irs = []
        irs_query = db.collection("archive_irs").where("archivedByDC", "==", True).stream()

        for doc in irs_query:
            data = doc.to_dict()
            data["id"] = doc.id
            data["isRevision"] = False
            archive_irs.append(data)

        print(f"✅ Found {len(archive_irs)} archived IRs")

        # جلب Revisions مؤرشفة بواسطة DC
        archive_revs = []
        revs_query = db.collection("archive_revs").where("archivedByDC", "==", True).stream()

        for doc in revs_query:
            data = doc.to_dict()
            data["id"] = doc.id
            data["isRevision"] = True
            archive_revs.append(data)

        print(f"✅ Found {len(archive_revs)} archived revisions")

        # دمج النتائج
        all_archive = archive_irs + archive_revs

        return jsonify({
            "archive": all_archive,
            "count": len(all_archive)
        })

    except Exception as e:
        print(f"❌ Get DC archive error: {str(e)}")
        traceback.print_exc()
        return jsonify({"error": f"Failed to load archive: {str(e)}"}), 500

@app.route('/archive/engineer', methods=['GET'])
def get_engineer_archive():
    """جلب الأرشيف الخاص بالمهندس"""
    try:
        user_param = request.args.get("user", "").strip()

        # جلب IRs مؤرشفة بواسطة المهندس
        archive_irs = []
        irs_query = db.collection("archive_irs").where("archivedByEngineer", "==", True).stream()

        for doc in irs_query:
            data = doc.to_dict()
            if user_param and data.get("user") != user_param:
                continue
            data["id"] = doc.id
            data["isRevision"] = False
            archive_irs.append(data)

        # جلب Revisions مؤرشفة بواسطة المهندس
        archive_revs = []
        revs_query = db.collection("archive_revs").where("archivedByEngineer", "==", True).stream()

        for doc in revs_query:
            data = doc.to_dict()
            if user_param and data.get("user") != user_param:
                continue
            data["id"] = doc.id
            data["isRevision"] = True
            archive_revs.append(data)

        # دمج النتائج
        all_archive = archive_irs + archive_revs

        return jsonify({
            "archive": all_archive,
            "count": len(all_archive)
        })

    except Exception as e:
        print(f"❌ Get engineer archive error: {str(e)}")
        traceback.print_exc()
        return jsonify({"error": f"Failed to load archive: {str(e)}"}), 500

# =============================================
# 📄 ROUTES: USER SPECIFIC DATA
# =============================================

@app.route('/irs-by-user-and-dept', methods=['GET'])
def get_irs_by_user_and_dept():
    """جلب IRs وRevisions لمستخدم وقسم محدد"""
    try:
        user = request.args.get("user", "").strip()
        dept = request.args.get("dept", "").strip()

        print(f"📥 Fetching records for user: {user}, department: {dept}")

        if not user or not dept:
            return jsonify({"error": "User and department are required"}), 400

        # جلب IRs الخاصة بالمستخدم والقسم
        irs_list = []
        irs_query = db.collection("irs").where("user", "==", user).where("department", "==", dept).stream()

        for doc in irs_query:
            data = doc.to_dict()
            data["id"] = doc.id
            irs_list.append(data)

        print(f"✅ Found {len(irs_list)} IRs for {user}")

        # جلب Revisions الخاصة بالمستخدم والقسم
        revs_list = []
        revs_query = db.collection("revs").where("user", "==", user).where("department", "==", dept).stream()

        for doc in revs_query:
            data = doc.to_dict()
            data["id"] = doc.id
            revs_list.append(data)

        print(f"✅ Found {len(revs_list)} revisions for {user}")

        return jsonify({
            "irs": irs_list,
            "revs": revs_list,
            "total": len(irs_list) + len(revs_list)
        })

    except Exception as e:
        print(f"❌ Get records error: {str(e)}")
        traceback.print_exc()
        return jsonify({"error": f"Failed to load records: {str(e)}"}), 500

# =============================================
# 📄 ROUTES: WORD GENERATION
# =============================================

@app.route('/generate-word', methods=['POST'])
def generate_word():
    try:
        data = request.json
        print(f"📥 Word generation request received")

        if not data:
            return jsonify({"error": "No data provided"}), 400

        project_name = data.get("project", "")
        dept_input = data.get("department", "")
        request_type = data.get("requestType", "IR").upper()
        desc = data.get("desc", "")
        user_ir_no = data.get("irNo", "").strip()
        old_ir_no = data.get("oldIrNo", "").strip()
        downloaded_by = data.get("downloadedBy", "dc")

        print(f"🔧 Word generation details:")
        print(f"   Project: {project_name}")
        print(f"   Department: {dept_input}")
        print(f"   Request Type: {request_type}")
        print(f"   User IR No: {user_ir_no}")
        print(f"   Old IR No: {old_ir_no}")

        if not project_name or not dept_input:
            return jsonify({"error": "Project and department are required"}), 400

        # ✅ تحديد القسم المختصر باستخدام الدالة الصحيحة
        dept_code = normalize_dept_for_ir(dept_input)
        clean_project = project_name.replace(" ", "-").upper() if project_name else ""

        # معالجة رقم IR
        ir_no_val = ""
        ir_no_full = ""

        if user_ir_no and user_ir_no.strip():
            # استخدام الرقم المخصص من المستخدم
            ir_no_full = user_ir_no.strip()

            # استخراج الرقم التسلسلي
            if user_ir_no.startswith("BADYA-CON-"):
                parts = user_ir_no.split("-")
                if len(parts) >= 6:
                    try:
                        ir_no_val = parts[-1]
                    except:
                        ir_no_val = "001"
            elif "-" in user_ir_no:
                parts = user_ir_no.split("-")
                try:
                    ir_no_val = parts[-1]
                except:
                    ir_no_val = "001"
            else:
                ir_no_val = user_ir_no

            # إصلاح القسم في الرقم إذا لزم الأمر
            if dept_code and "BADYA-CON" in ir_no_full:
                parts = ir_no_full.split("-")
                if len(parts) >= 5:
                    parts[4] = dept_code
                    ir_no_full = "-".join(parts)
        else:
            # توليد رقم جديد باستخدام projects collection فقط
            print(f"⚠️ No user-provided IR number, generating new one using projects counter")

            project_ref = db.collection("projects").document(project_name)
            project_doc = project_ref.get()

            if project_doc.exists:
                p_data = project_doc.to_dict()
                counters = p_data.get("counters", {})

                # تحديد مفتاح العداد
                counter_key = "CPR" if request_type == "CPR" else dept_code
                current_count = counters.get(counter_key, 0) + 1

                # تحديث العداد
                counters[counter_key] = current_count
                project_ref.update({
                    "counters": counters,
                    "updatedAt": get_now_str()
                })

                ir_no_val = f"{current_count:03d}"

                if request_type == "CPR":
                    ir_no_full = f"BADYA-CON-{clean_project}-CPR-{ir_no_val}"
                else:
                    ir_no_full = f"BADYA-CON-{clean_project}-IR-{dept_code}-{ir_no_val}"
            else:
                # إنشاء المشروع إذا لم يكن موجوداً
                project_ref.set({
                    "name": project_name,
                    "counters": {
                        "ARCH": 0,
                        "ST": 0 if request_type != "CPR" else 1,
                        "MECH": 0,
                        "ELECT": 0,
                        "SURV": 0,
                        "CPR": 1 if request_type == "CPR" else 0
                    },
                    "createdAt": get_now_str(),
                    "updatedAt": get_now_str()
                })

                ir_no_val = "001"
                if request_type == "CPR":
                    ir_no_full = f"BADYA-CON-{clean_project}-CPR-001"
                else:
                    ir_no_full = f"BADYA-CON-{clean_project}-IR-{dept_code}-001"

        print(f"✅ Final IR Number: {ir_no_full}")

        # تحديث العنصر في قاعدة البيانات
        try:
            target_ir_no = old_ir_no if old_ir_no else user_ir_no

            if target_ir_no and target_ir_no.strip():
                print(f"🔄 Looking for item: {target_ir_no}")

                # البحث في IRS النشطة
                ir_doc = db.collection("irs").document(target_ir_no).get()

                if ir_doc.exists:
                    print(f"✅ Found item to mark as done: {target_ir_no}")

                    update_data = {
                        "isDone": True,
                        "downloadedBy": downloaded_by,
                        "downloadedAt": get_now_str(),
                        "completedAt": get_now_str(),
                        "updatedAt": get_now_str(),
                        "status": "completed"
                    }

                    if user_ir_no and user_ir_no.strip() != target_ir_no:
                        print(f"🔄 Updating IR number from {target_ir_no} to {user_ir_no}")

                        item_data = ir_doc.to_dict()
                        item_data.update(update_data)
                        item_data["irNo"] = user_ir_no.strip()
                        item_data["oldIrNo"] = target_ir_no

                        # حفظ النسخة الجديدة
                        db.collection("irs").document(user_ir_no.strip()).set(item_data)

                        # حذف النسخة القديمة
                        db.collection("irs").document(target_ir_no).delete()

                        print(f"✅ Updated IR number to: {user_ir_no}")
                    else:
                        db.collection("irs").document(target_ir_no).update(update_data)
                        print(f"✅ Marked item as done: {target_ir_no}")
        except Exception as db_error:
            print(f"⚠️ Database update error (non-critical): {db_error}")

        # تحديد القالب
        template_map = {
            "ARCH": "ARCH.docx",
            "ST": "ST.docx",
            "SURV": "SURV.docx",
            "ELECT": "ELECT.docx",
            "MECH": "ST.docx"
        }

        if request_type == "CPR":
            t_name = "ST.docx"
        else:
            t_name = template_map.get(dept_code, "ARCH.docx")

        # البحث عن القالب
        t_path = None

        # محاولة 1: المسار المخصص
        custom_path = os.path.join("/home/JosephReda1212/templates", t_name)
        if os.path.exists(custom_path):
            t_path = custom_path
            print(f"✅ Found template at custom path: {t_path}")
        else:
            # محاولة 2: المسار المحلي
            local_path = os.path.join(BASE_DIR, "templates", t_name)
            if os.path.exists(local_path):
                t_path = local_path
                print(f"✅ Found template at local path: {t_path}")
            else:
                # محاولة 3: أي مكان في templates
                templates_dir = os.path.join(BASE_DIR, "templates")
                if os.path.exists(templates_dir):
                    for file in os.listdir(templates_dir):
                        if file.endswith(".docx"):
                            t_path = os.path.join(templates_dir, file)
                            print(f"⚠️ Using fallback template: {t_path}")
                            break

        if not t_path:
            return jsonify({"error": f"Template file not found: {t_name}"}), 404

        print(f"📄 Using template: {t_path}")

        # تحميل القالب
        doc = DocxTemplate(t_path)
        today_date = get_date_str()

        # إعداد السياق
        display_type = "CONCRETE POURING REQUEST (CPR)" if request_type == "CPR" else "INSPECTION REQUEST (IR)"
        description_text = desc or data.get("desc", "")

        # السياق النهائي
        context = {
            "IRNo": ir_no_full,
            "IRNoShort": ir_no_val,
            "ProjectName": project_name,
            "Description": description_text,
            "ReceivedDate": today_date,
            "requestType": display_type,
            "CurrentDate": today_date,
            "TodayDate": today_date,
            "Department": dept_input,
            "DownloadedBy": downloaded_by
        }

        # إضافة حقول CPR إذا كانت موجودة
        if request_type == "CPR":
            if data.get("concreteGrade"):
                context["ConcreteGrade"] = data.get("concreteGrade")
            if data.get("pouringElement"):
                context["PouringElement"] = data.get("pouringElement")
            if data.get("floor"):
                context["Floor"] = data.get("floor")

        print(f"📋 Template context prepared")

        # تحميل القالب
        try:
            doc.render(context)
        except Exception as render_error:
            print(f"⚠️ Template rendering error: {render_error}")
            simple_context = {
                "IRNo": ir_no_full,
                "ProjectName": project_name,
                "Description": description_text,
                "ReceivedDate": today_date,
                "requestType": display_type
            }
            doc.render(simple_context)

        # حفظ المستند
        output = BytesIO()
        doc.save(output)
        output.seek(0)

        file_size = len(output.getvalue())
        print(f"✅ Word file generated successfully ({file_size} bytes)")

        response = make_response(output.getvalue())
        filename = f"{ir_no_full}.docx"

        response.headers["Content-Disposition"] = f"attachment; filename={filename}"
        response.headers["Content-Type"] = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"

        print(f"✅ File ready for download: {filename}")
        return response

    except Exception as e:
        print(f"❌ Word generation error: {str(e)}")
        traceback.print_exc()
        return jsonify({"error": f"Word generation failed: {str(e)}"}), 500

# =============================================
# 🏗️ ROUTES: PROJECTS
# =============================================

@app.route('/projects', methods=['GET'])
def get_projects():
    """جلب جميع المشاريع"""
    try:
        docs = db.collection("projects").stream()
        projects = {}

        for doc in docs:
            projects[doc.id] = doc.to_dict()

        return jsonify({"projects": projects})

    except Exception as e:
        print(f"❌ Get projects error: {str(e)}")
        return jsonify({"error": f"Failed to load projects: {str(e)}"}), 500

@app.route('/locations', methods=['GET'])
def get_locations():
    """جلب مواقع المشروع"""
    project = request.args.get("project", "").strip()

    if not project:
        return jsonify({"locations": [], "types_map": {}})

    try:
        locations = []
        types_map = {}

        # جلب من location_rules أولاً
        location_rules_doc = db.collection("location_rules").document(project).get()

        if location_rules_doc.exists:
            location_data = location_rules_doc.to_dict()
            if "rules" in location_data and isinstance(location_data["rules"], list):
                for rule in location_data["rules"]:
                    if isinstance(rule, dict) and "pattern" in rule:
                        locations.append(rule["pattern"])
                        if "type" in rule:
                            types_map[rule["pattern"]] = rule["type"]

        # إذا لم توجد مواقع، جلب من المشروع
        if not locations:
            project_doc = db.collection("projects").document(project).get()
            if project_doc.exists:
                project_data = project_doc.to_dict()
                if "locations" in project_data:
                    locs_data = project_data["locations"]
                    if isinstance(locs_data, list):
                        for loc in locs_data:
                            if isinstance(loc, str):
                                locations.append(loc)
                            elif isinstance(loc, dict) and "pattern" in loc:
                                locations.append(loc["pattern"])
                                if "type" in loc:
                                    types_map[loc["pattern"]] = loc["type"]

        # إذا لم توجد مواقع بعد، إنشاء قائمة افتراضية
        if not locations:
            locations = [f"{project}-Main", f"{project}-Service", f"{project}-Parking"]

        return jsonify({
            "locations": locations,
            "types_map": types_map
        })

    except Exception as e:
        print(f"❌ Get locations error: {str(e)}")
        return jsonify({"locations": [], "types_map": {}, "error": str(e)})

# =============================================
# 🩺 HEALTH CHECK
# =============================================

@app.route('/health', methods=['GET'])
def health_check():
    """فحص صحة الخادم"""
    try:
        # فحص اتصال Firebase
        db.collection("users").limit(1).get()

        return jsonify({
            "status": "healthy",
            "timestamp": get_now_str(),
            "database": "connected",
            "version": "2.2",
            "features": {
                "unified_counters": True,
                "archive": True,
                "cpr": True,
                "revisions": True,
                "word_generation": True
            }
        })
    except Exception as e:
        print(f"❌ Health check error: {str(e)}")
        return jsonify({
            "status": "unhealthy",
            "error": str(e),
            "timestamp": get_now_str()
        }), 500

# =============================================
# 🚀 RUN SERVER
# =============================================

if __name__ == '__main__':
    print("🚀 Starting Flask server...")
    print(f"📂 Base directory: {BASE_DIR}")
    print(f"🔐 Service account: {SERVICE_ACCOUNT_PATH}")
    print("✅ CORS middleware enabled")
    print("🌐 Server running on http://0.0.0.0:5000")

    # فحص مجلد القوالب
    templates_dir = os.path.join(BASE_DIR, "templates")
    if os.path.exists(templates_dir):
        print(f"📁 Templates directory found: {templates_dir}")
        templates = os.listdir(templates_dir)
        print(f"   Available templates: {templates}")
    else:
        print(f"⚠️ Templates directory not found: {templates_dir}")

    app.run(debug=True, port=5000, host='0.0.0.0')