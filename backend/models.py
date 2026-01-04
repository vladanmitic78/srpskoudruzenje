from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List, Dict
from datetime import datetime
from bson import ObjectId

# Custom PyObjectId for MongoDB
class PyObjectId(ObjectId):
    @classmethod
    def __get_validators__(cls):
        yield cls.validate

    @classmethod
    def validate(cls, v):
        if not ObjectId.is_valid(v):
            raise ValueError("Invalid objectid")
        return ObjectId(v)

    @classmethod
    def __modify_schema__(cls, field_schema):
        field_schema.update(type="string")

# Multi-language text
class MultiLangText(BaseModel):
    sr_latin: str = Field(alias="sr-latin")
    sr_cyrillic: str = Field(alias="sr-cyrillic")
    en: str
    sv: str

    class Config:
        populate_by_name = True

# User Models
class UserBase(BaseModel):
    username: str
    email: EmailStr
    fullName: str
    phone: Optional[str] = None
    yearOfBirth: Optional[str] = None
    address: Optional[str] = None
    parentName: Optional[str] = None
    parentEmail: Optional[EmailStr] = None
    parentPhone: Optional[str] = None

class UserCreate(UserBase):
    password: str

class PasswordChange(BaseModel):
    currentPassword: str
    newPassword: str

class UserUpdate(BaseModel):
    fullName: Optional[str] = None
    phone: Optional[str] = None
    yearOfBirth: Optional[str] = None
    address: Optional[str] = None
    parentName: Optional[str] = None
    parentEmail: Optional[EmailStr] = None
    parentPhone: Optional[str] = None

class UserInDB(UserBase):
    id: str = Field(alias="_id")
    hashed_password: str
    role: str = "user"  # user, admin, superadmin
    emailVerified: bool = False
    createdAt: datetime = Field(default_factory=datetime.utcnow)
    verificationToken: Optional[str] = None

    class Config:
        populate_by_name = True
        json_encoders = {ObjectId: str}

class UserResponse(UserBase):
    id: str
    role: str
    emailVerified: bool
    createdAt: datetime

# Auth Models
class LoginRequest(BaseModel):
    username: str
    password: str

class LoginResponse(BaseModel):
    success: bool
    token: str
    user: UserResponse

class RegisterResponse(BaseModel):
    success: bool
    message: str
    userId: str

# News Models
class NewsBase(BaseModel):
    date: str
    title: Dict[str, str]
    text: Dict[str, str]
    image: str
    video: Optional[str] = None

class NewsCreate(NewsBase):
    pass

class NewsInDB(NewsBase):
    id: str = Field(alias="_id")
    createdAt: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
        json_encoders = {ObjectId: str}

class NewsResponse(NewsBase):
    id: str
    createdAt: datetime

# Event Models
class EventBase(BaseModel):
    date: str
    time: str
    title: Dict[str, str]
    location: str
    description: Dict[str, str]
    status: str = "active"  # active, cancelled
    cancellationReason: Optional[str] = None

class EventCreate(EventBase):
    pass

class EventUpdate(BaseModel):
    date: Optional[str] = None
    time: Optional[str] = None
    title: Optional[Dict[str, str]] = None
    location: Optional[str] = None
    description: Optional[Dict[str, str]] = None
    status: Optional[str] = None
    cancellationReason: Optional[str] = None

class EventInDB(EventBase):
    id: str = Field(alias="_id")
    participants: List[str] = []  # User IDs
    createdAt: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
        json_encoders = {ObjectId: str}

class EventResponse(EventBase):
    id: str
    createdAt: datetime

# Invoice Models
class InvoiceBase(BaseModel):
    userId: str
    amount: float
    currency: str = "SEK"
    dueDate: str
    description: str
    fileUrl: Optional[str] = None

class InvoiceCreate(InvoiceBase):
    pass

class InvoiceInDB(InvoiceBase):
    id: str = Field(alias="_id")
    status: str = "unpaid"  # paid, unpaid
    paymentDate: Optional[str] = None
    createdAt: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
        json_encoders = {ObjectId: str}

class InvoiceResponse(InvoiceBase):
    id: str
    status: str
    paymentDate: Optional[str] = None
    createdAt: datetime

class InvoiceMarkPaid(BaseModel):
    paymentDate: str

# Gallery Models
class GalleryBase(BaseModel):
    date: str
    title: Optional[Dict[str, str]] = None
    description: Dict[str, str]
    place: Optional[str] = None
    images: List[str] = []
    videos: List[str] = []

class GalleryCreate(GalleryBase):
    pass

class GalleryInDB(GalleryBase):
    id: str = Field(alias="_id")
    createdAt: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
        json_encoders = {ObjectId: str}

class GalleryResponse(GalleryBase):
    id: str
    createdAt: datetime

# Serbian Story Models
class StoryBase(BaseModel):
    date: str
    title: Dict[str, str]
    text: Dict[str, str]
    image: Optional[str] = None
    video: Optional[str] = None
    url: Optional[str] = None

class StoryCreate(StoryBase):
    pass

class StoryInDB(StoryBase):
    id: str = Field(alias="_id")
    createdAt: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
        json_encoders = {ObjectId: str}

class StoryResponse(StoryBase):
    id: str
    createdAt: datetime

# Settings Models
class SocialMedia(BaseModel):
    facebook: str = ""
    instagram: str = ""
    youtube: str = ""
    snapchat: str = ""

class VisibilitySettings(BaseModel):
    contactEmail: bool = True
    contactPhone: bool = True
    address: bool = True
    socialMediaFacebook: bool = False
    socialMediaInstagram: bool = False
    socialMediaYoutube: bool = False
    socialMediaSnapchat: bool = False
    orgNumber: bool = True
    vatNumber: bool = True
    bankAccount: bool = True

class SettingsBase(BaseModel):
    address: str = ""
    bankAccount: str = ""
    vatNumber: str = ""
    registrationNumber: str = ""
    contactEmail: EmailStr
    contactPhone: str = ""
    socialMedia: SocialMedia = SocialMedia()
    visibility: Optional[VisibilitySettings] = None

class SettingsInDB(SettingsBase):
    id: str = Field(alias="_id")
    updatedAt: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
        json_encoders = {ObjectId: str}

# Contact Form
class ContactForm(BaseModel):
    name: str
    email: EmailStr
    topic: str  # member, finance, sponsorship, other
    message: str

# Membership Cancellation
class MembershipCancellation(BaseModel):
    reason: str