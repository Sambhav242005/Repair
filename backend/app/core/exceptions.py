from typing import Any, Optional
from fastapi import HTTPException

class AppException(HTTPException):
    def __init__(
        self,
        status_code: int,
        code: str,
        message: str,
        details: Optional[Any] = None,
    ):
        super().__init__(status_code=status_code, detail=message)
        self.code = code
        self.message = message
        self.details = details

class NotFoundException(AppException):
    def __init__(self, message: str, details: Optional[Any] = None):
        super().__init__(
            status_code=404,
            code="NOT_FOUND",
            message=message,
            details=details,
        )

class ValidationException(AppException):
    def __init__(self, message: str, details: Optional[Any] = None):
        super().__init__(
            status_code=422,
            code="VALIDATION_ERROR",
            message=message,
            details=details,
        )

class ScheduleConflictException(AppException):
    def __init__(self, message: str, details: Optional[Any] = None):
        super().__init__(
            status_code=409,
            code="SCHEDULE_CONFLICT",
            message=message,
            details=details,
        )

class AssetUnavailableException(AppException):
    def __init__(self, message: str, details: Optional[Any] = None):
        super().__init__(
            status_code=409,
            code="ASSET_UNAVAILABLE",
            message=message,
            details=details,
        )

class AlreadyCompletedException(AppException):
    def __init__(self, message: str, details: Optional[Any] = None):
        super().__init__(
            status_code=409,
            code="ALREADY_COMPLETED",
            message=message,
            details=details,
        )

class ProviderUnavailableException(AppException):
    def __init__(self, message: str, details: Optional[Any] = None):
        super().__init__(
            status_code=503,
            code="PROVIDER_UNAVAILABLE",
            message=message,
            details=details,
        )

class InternalErrorException(AppException):
    def __init__(self, message: str, details: Optional[Any] = None):
        super().__init__(
            status_code=500,
            code="INTERNAL_ERROR",
            message=message,
            details=details,
        )
