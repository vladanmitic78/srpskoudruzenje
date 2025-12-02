from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from auth_utils import decode_access_token

security = HTTPBearer()

async def get_db(request: Request):
    """Get database from app state"""
    return request.app.state.db

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security), request: Request = None) -> dict:
    """Verify JWT token and get current user"""
    token = credentials.credentials
    payload = decode_access_token(token)
    
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token"
        )
    
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload"
        )
    
    db = request.app.state.db
    user = await db.users.find_one({"_id": user_id})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )
    
    return user

async def get_admin_user(current_user: dict = Depends(get_current_user)) -> dict:
    """Verify user is admin, moderator, or superadmin"""
    if current_user.get("role") not in ["admin", "moderator", "superadmin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return current_user

async def get_superadmin_user(current_user: dict = Depends(get_current_user)) -> dict:
    """Verify user is superadmin"""
    if current_user.get("role") != "superadmin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Super admin access required"
        )
    return current_user