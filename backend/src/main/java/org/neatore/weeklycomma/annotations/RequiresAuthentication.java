package org.neatore.weeklycomma.annotations;

import org.neatore.weeklycomma.domain.User;

import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.Target;

@Retention(RetentionPolicy.RUNTIME)
@Target({ ElementType.METHOD, ElementType.TYPE })
public @interface RequiresAuthentication {
    // Interceptor checks only if the client is logged in when the value is empty.
    // If the value is not empty, the interceptor checks if the user's type is included in the value.
    User.UserType[] value() default {};
}
