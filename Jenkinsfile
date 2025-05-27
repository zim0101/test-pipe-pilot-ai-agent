pipeline {
    agent any
    
    environment {
        DOCKER_IMAGE = "solar-system-app"
        DOCKER_TAG = "${env.BUILD_NUMBER}"
        DOCKER_COMPOSE_FILE = "docker-compose.yml"
        NODE_VERSION = "18"
        APP_PORT = "3001"
        MONGO_PORT = "27017"
        MONGO_INITDB_DATABASE = credentials('mongo-db-name')
        MONGO_INITDB_ROOT_USERNAME = credentials('mongo-username')
        MONGO_INITDB_ROOT_PASSWORD = credentials('mongo-password')
        SONAR_PROJECT_KEY = "solar-system-app"
    }
    
    parameters {
        choice(name: 'ENVIRONMENT', choices: ['dev', 'staging', 'prod'], description: 'Deployment environment')
        booleanParam(name: 'RUN_TESTS', defaultValue: true, description: 'Run tests during build')
        booleanParam(name: 'DEPLOY', defaultValue: true, description: 'Deploy after successful build')
    }
    
    options {
        timeout(time: 30, unit: 'MINUTES')
        disableConcurrentBuilds()
        buildDiscarder(logRotator(numToKeepStr: '10'))
        ansiColor('xterm')
    }
    
    stages {
        stage('Checkout') {
            steps {
                checkout scm
                sh 'git log -1 --pretty=format:"%h - %an, %ar : %s"'
            }
        }
        
        stage('Setup Environment') {
            steps {
                sh 'node --version'
                sh 'npm --version'
                sh 'docker --version'
                sh 'docker-compose --version'
                
                script {
                    // Create .env file for docker-compose
                    sh '''
                        echo "MONGO_PORT=${MONGO_PORT}" > .env
                        echo "MONGO_INITDB_DATABASE=${MONGO_INITDB_DATABASE}" >> .env
                        echo "MONGO_INITDB_ROOT_USERNAME=${MONGO_INITDB_ROOT_USERNAME}" >> .env
                        echo "MONGO_INITDB_ROOT_PASSWORD=${MONGO_INITDB_ROOT_PASSWORD}" >> .env
                    '''
                }
            }
        }
        
        stage('Install Dependencies') {
            steps {
                sh 'npm ci'
            }
        }
        
        stage('Run Tests') {
            when {
                expression { return params.RUN_TESTS }
            }
            steps {
                sh 'npm test'
            }
            post {
                always {
                    junit allowEmptyResults: true, testResults: 'test-results.xml'
                }
            }
        }
        
        stage('Code Analysis') {
            when {
                anyOf {
                    branch 'main'
                    branch 'develop'
                }
            }
            parallel {
                stage('ESLint') {
                    steps {
                        sh 'npm install eslint --no-save'
                        sh 'npx eslint . --ext .js || true'
                    }
                }
                stage('SonarQube Analysis') {
                    steps {
                        withSonarQubeEnv('SonarQube') {
                            sh '''
                                npm install sonarqube-scanner --no-save
                                npx sonar-scanner \
                                  -Dsonar.projectKey=${SONAR_PROJECT_KEY} \
                                  -Dsonar.sources=. \
                                  -Dsonar.exclusions=node_modules/**,coverage/**,.nyc_output/**
                            '''
                        }
                    }
                }
            }
        }
        
        stage('Build Docker Image') {
            steps {
                sh 'docker build -t ${DOCKER_IMAGE}:${DOCKER_TAG} .'
                sh 'docker tag ${DOCKER_IMAGE}:${DOCKER_TAG} ${DOCKER_IMAGE}:latest'
            }
        }
        
        stage('Deploy') {
            when {
                allOf {
                    expression { return params.DEPLOY }
                    anyOf {
                        branch 'main'
                        branch 'develop'
                    }
                }
            }
            steps {
                script {
                    def deployEnv = params.ENVIRONMENT
                    echo "Deploying to ${deployEnv} environment"
                    
                    // Stop existing containers
                    sh 'docker-compose down || true'
                    
                    // Start containers with the new image
                    sh 'docker-compose up -d'
                    
                    // Verify deployment
                    sh 'sleep 10'
                    sh 'docker ps | grep solar-system'
                    sh 'curl -s http://localhost:${APP_PORT}/health || echo "Health check failed"'
                }
            }
        }
    }
    
    post {
        always {
            // Clean workspace
            cleanWs(cleanWhenNotBuilt: false,
                    deleteDirs: true,
                    disableDeferredWipeout: true,
                    notFailBuild: true,
                    patterns: [[pattern: '.env', type: 'INCLUDE']])
            
            // Generate test coverage report
            sh 'npm run coverage || true'
            publishHTML(target: [
                allowMissing: true,
                alwaysLinkToLastBuild: false,
                keepAll: true,
                reportDir: 'coverage',
                reportFiles: 'index.html',
                reportName: 'Coverage Report'
            ])
        }
        success {
            echo 'Build completed successfully!'
            slackSend(color: 'good', message: "Build Successful: ${env.JOB_NAME} #${env.BUILD_NUMBER} (<${env.BUILD_URL}|Open>)")
        }
        failure {
            echo 'Build failed!'
            slackSend(color: 'danger', message: "Build Failed: ${env.JOB_NAME} #${env.BUILD_NUMBER} (<${env.BUILD_URL}|Open>)")
        }
        cleanup {
            // Clean up Docker resources
            sh 'docker image prune -f'
        }
    }
}