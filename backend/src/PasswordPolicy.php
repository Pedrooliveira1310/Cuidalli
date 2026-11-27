<?php
declare(strict_types=1);

final class PasswordPolicy {
    public static function validate(mixed $value): string {
        $password = is_string($value) ? trim($value) : '';
        if (preg_match_all('/./us', $password) < 12 || strlen($password) > 72
            || preg_match('/[\p{Cc}]/u', $password)
            || !preg_match('/\p{L}/u', $password)
            || !preg_match('/[\p{N}\p{P}\p{S}]/u', $password)) {
            throw new ApiError(422, 'Use pelo menos 12 caracteres, com letras e um número ou símbolo. A senha pode ter até 72 bytes.');
        }
        return $password;
    }
}
