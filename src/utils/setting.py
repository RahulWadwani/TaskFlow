from pydantic_settings import SettingsConfigDict, BaseSettings


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        extra="ignore"
    )

    DB_CONNECTION: str
    SECRET_KEY: str
    ALGORITHM: str
    EXP_Time: str


settings = Settings()
# print(str(settings.DB_CONNECTION))