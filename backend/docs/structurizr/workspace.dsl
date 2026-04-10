workspace "EBIF Backend Architecture" "Structurizr workspace for the EBIF clean architecture backend." {

    model {
        user = person "Staff User" "Administrative, reception, medical, and operations user."

        ebif = softwareSystem "EBIF Platform" "System for Espina Bífida association operations." {
            frontend = container "Frontend" "Consumes the backend API for daily operations." "Angular"

            backend = container "Backend API" "Exposes HTTP endpoints and executes business use cases." "Python, FastAPI" {
                presentation = component "Presentation Layer" "HTTP entrypoint: app factory, router composition, endpoint routers, API security." "FastAPI routers and middleware"
                application = component "Application Layer" "Use cases and orchestration. Delegates to repository ports." "Python modules"
                domain = component "Domain Layer" "Domain entities, exceptions, and repository port contracts." "Python protocols and dataclasses"
                wiring = component "Wiring / Bootstrap" "Binds concrete infrastructure adapters into application use cases at startup." "bootstrap.py"
                infrastructure = component "Infrastructure Layer" "Oracle repositories, auth helpers, crypto, audit logging, persistence, startup migrations." "Python adapters"
            }

            database = container "Oracle Database" "Primary relational database for operational data." "Oracle Database"
        }

        user -> frontend "Uses"
        frontend -> backend "Calls API" "HTTPS/JSON"
        backend -> database "Reads and writes data" "Oracle SQL"

        presentation -> application "Invokes use cases"
        presentation -> infrastructure "Uses API auth adapter"
        application -> domain "Depends on ports and domain models"
        wiring -> application "Configures repositories"
        wiring -> infrastructure "Instantiates concrete adapters"
        infrastructure -> domain "Implements repository ports"
        infrastructure -> database "Executes SQL" "Oracle SQL"
    }

    views {
        systemContext ebif "system-context" {
            include *
            autoLayout lr
            title "EBIF Platform - System Context"
        }

        container ebif "container-view" {
            include *
            autoLayout lr
            title "EBIF Platform - Containers"
        }

        component backend "backend-components" {
            include *
            autoLayout lr
            title "EBIF Backend - Internal Components"
        }

        styles {
            element "Person" {
                shape person
                background #0b3c5d
                color #ffffff
            }

            element "Software System" {
                background #1d4e89
                color #ffffff
            }

            element "Container" {
                background #2e7d6f
                color #ffffff
            }

            element "Component" {
                background #8fb339
                color #111111
            }

            element "Database" {
                shape cylinder
                background #6c757d
                color #ffffff
            }
        }
    }
}
