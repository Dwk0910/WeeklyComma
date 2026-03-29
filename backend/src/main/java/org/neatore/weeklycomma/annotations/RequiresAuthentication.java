package org.neatore.weeklycomma.annotations;

import org.neatore.weeklycomma.domain.User;

import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.Target;

@Retention(RetentionPolicy.RUNTIME)
@Target({ ElementType.METHOD, ElementType.TYPE })
public @interface RequiresAuthentication {
    // Interceptor returns true if the UserType field is empty
    User.UserType[] value() default {};
}
