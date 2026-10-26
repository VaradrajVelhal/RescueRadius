from django.urls import path

from .views import (
    CustomTokenObtainPairView,
    RefreshTokenView,
    RegisterView,
    UserMeView,
)

urlpatterns = [
    path("register/", RegisterView.as_view(), name="auth_register"),
    path("login/", CustomTokenObtainPairView.as_view(), name="auth_login"),
    path("token/refresh/", RefreshTokenView.as_view(), name="auth_token_refresh"),
    path("me/", UserMeView.as_view(), name="auth_me"),
]
