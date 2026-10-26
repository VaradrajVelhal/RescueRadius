from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from .serializers import (
    CustomTokenObtainPairSerializer,
    RegisterSerializer,
    UserMeSerializer,
)


class RegisterView(generics.CreateAPIView):
    """
    Public registration endpoint.
    Defaults role to CITIZEN. Rejects ADMIN self-registration attempts.
    """
    permission_classes = [permissions.AllowAny]
    serializer_class = RegisterSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        response_serializer = UserMeSerializer(user)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)


class CustomTokenObtainPairView(TokenObtainPairView):
    """
    Login endpoint. Returns JWT access & refresh tokens along with basic user info.
    """
    permission_classes = [permissions.AllowAny]
    serializer_class = CustomTokenObtainPairSerializer


class RefreshTokenView(TokenRefreshView):
    """
    JWT token refresh endpoint.
    """
    permission_classes = [permissions.AllowAny]


class UserMeView(generics.RetrieveAPIView):
    """
    Authenticated current user profile endpoint.
    """
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = UserMeSerializer

    def get_object(self):
        return self.request.user
