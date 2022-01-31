<template>
	<!--
		WikiLambda Vue component for the general ZObject editor.

		@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
		@license MIT
	-->
	<div>
		<div class="ext-wikilambda-function-editor ext-wikilambda-editor-two-cols">
			<aside :aria-label="$i18n( 'wikilambda-editor-steps-label' )">
				<div
					v-for="( step, index ) in steps"
					:key="index"
					class="ext-wikilambda-editor-vertical-progress-list"
				>
					<strong>
						<router-link :to="navigateToFirstStepItem( step )">
							{{ step.title }}
						</router-link>
					</strong>
					<ul class="ext-wikilambda-editor-progress-list">
						<li
							v-for="item in step.items"
							:key="item.id"
							:class="'ext-wikilambda-editor-step ' + isCurrentTab( item.id )"
						>
							<span>
								<router-link :to="getRouterTo( item.id )">
									{{ item.title }}
								</router-link>
							</span>
						</li>
					</ul>
				</div>
				<div class="ext-wikilambda-editor-horizontal-progress-list">
					<ul class="ext-wikilambda-editor-progress-list ext-wikilambda-editor-tabs">
						<li
							v-for="( step, index ) in steps"
							:key="index"
							:class="{
								'ext-wikilambda-editor-active': currentStepCategory.title === step.title,
								'ext-wikilambda-editor-complete': step.completed
							}"
						>
							<strong>
								<router-link :to="navigateToFirstStepItem( step )">
									{{ step.title }}
								</router-link>
							</strong>
						</li>
					</ul>
					<ul class="ext-wikilambda-editor-progress-list">
						<li
							v-for="item in currentStepCategory.items"
							:key="item.id"
							:class="'ext-wikilambda-editor-step ' + isCurrentTab( item.id )"
						>
							<span>
								<router-link
									:to="getRouterTo( item.id )"
									:class="[
										'ext-wikilambda-editor-step-link',
										{ 'ext-wikilambda-editor-step-link-disabled': getIsSavingObject }
									]"
								>
									{{ item.title }}
								</router-link>
							</span>
						</li>
					</ul>
				</div>
			</aside>
			<main>
				<slot
					:navigate-to="navigateTo"
				></slot>

				<sd-message v-if="getZObjectMessage.text" :type="getZObjectMessage.type">
					{{ getZObjectMessage.text }}
				</sd-message>

				<div class="ext-wikilambda-editor-controls">
					<sd-button @click="previousStep">
						{{ $i18n( 'wikilambda-editor-go-back-button' ) }}
					</sd-button>
					<sd-button
						primary
						:disabled="getIsSavingObject"
						@click="nextStep"
					>
						{{ currentStepIndex === flatSteps.length - 1 ?
							$i18n( 'wikilambda-savenew' ) :
							$i18n( 'wikilambda-editor-next-button' )
						}}
					</sd-button>
				</div>
			</main>
			<aside :aria-label="$i18n( 'wikilambda-editor-additional-details-label' )">
				<slot name="right-aside"></slot>
			</aside>
		</div>
	</div>
</template>

<script>
var Constants = require( '../Constants.js' ),
	SdMessage = require( '../components/base/Message.vue' ),
	SdButton = require( '../components/base/Button.vue' ),
	VueRouter = require( '../../lib/vue-router/vue-router.common.js' ),
	mapGetters = require( 'vuex' ).mapGetters,
	mapActions = require( 'vuex' ).mapActions;

// @vue/component
module.exports = {
	components: {
		'sd-message': SdMessage,
		'sd-button': SdButton,
		'router-link': VueRouter
	},
	props: {
		steps: {
			type: Array,
			default: function () {
				return [];
			}
		}
	},
	computed: $.extend( mapGetters( [
		'getIsSavingObject',
		'getZObjectMessage'
	] ), {
		currentTab: function () {
			return this.$route.query.step;
		},
		flatSteps: function () {
			return this.steps.reduce( function ( flat, step ) {
				return flat.concat( step.items.map( function ( item ) {
					return item.id;
				} ) );
			}, [] );
		},
		currentStepIndex: function () {
			return this.flatSteps.indexOf( this.currentTab );
		},
		currentStepCategory: function () {
			for ( var index in this.steps ) {
				var step = this.steps[ index ];

				for ( var itemIndex in step.items ) {
					var item = step.items[ itemIndex ];
					if ( item.id === this.currentTab ) {
						return step;
					}
				}
			}

			return false;
		}
	} ),
	methods: $.extend( mapActions( [] ), {
		getRouterTo: function ( step ) {
			var query = JSON.parse( JSON.stringify( this.$route.query ) );
			query.step = step;
			query.zid = Constants.Z_FUNCTION;

			return {
				query: query
			};
		},
		navigateTo: function ( step ) {
			this.$router.push( this.getRouterTo( step ) );
		},
		isCurrentTab: function ( tab ) {
			var tabIndex = this.flatSteps.indexOf( tab );

			if ( tabIndex < this.currentStepIndex ) {
				return 'ext-wikilambda-editor-complete';
			} else if ( tabIndex === this.currentStepIndex ) {
				return 'ext-wikilambda-editor-active';
			}

			return '';
		},
		previousStep: function () {
			var currentStepIndex = this.currentStepIndex;

			if ( currentStepIndex > 1 ) {
				this.$router.push( this.getRouterTo( this.flatSteps[ currentStepIndex - 1 ] ) );
			}
		},
		nextStep: function () {

			// Prevent User from navigating to Other tabs while Saving Object
			if ( this.getIsSavingObject ) {
				return;
			}

			var currentStepIndex = this.currentStepIndex;

			if ( currentStepIndex < this.flatSteps.length - 1 ) {
				this.$router.push( this.getRouterTo( this.flatSteps[ currentStepIndex + 1 ] ) );
			} else {
				this.$store.dispatch( 'submitZObject', '' ).then( function ( result ) {
					if ( result ) {

						var route = this.$router.resolve( { name: 'edit', query: {
							title: result,
							action: 'edit',
							zid: Constants.Z_FUNCTION,
							step: 'behavior'
						} } );

						window.location.href = route.href;

					}

				}.bind( this ) );
			}
		},
		navigateToFirstStepItem: function ( step ) {
			for ( var index in step.items ) {
				var item = step.items[ index ];

				// If the item has a component, render it.
				if ( item.component ) {
					return this.getRouterTo( item.id );
				}
			}

			return this.$route;
		}
	} ),
	mounted: function () {
		// If the step is empty, set it to the first step
		if ( !this.$route.query.step || !this.$route.query.zid ) {
			this.$router.replace( this.getRouterTo( this.flatSteps[ 0 ] ) );
		}
	}
};
</script>

<style lang="less">
@import './../../lib/wikimedia-ui-base.less';

.ext-wikilambda-function-editor {
	display: grid;

	aside {
		.ext-wikilambda-editor-progress-list {
			list-style: none;
			padding: 1em 0.75em;
			margin: 0;

			li.ext-wikilambda-editor-step {
				position: relative;
				display: block;
				padding: 0.5em 0;
				color: #ccc;

				& span {
					display: inline-block;
					position: relative;
					padding-right: 3em;
				}

				& span:after {
					content: '✔';
					position: absolute;
					right: 0.5em;
					border: 1px solid #ccc;
					color: #ccc;
					border-radius: 9999px;
					width: 20px;
					height: 20px;
					margin: 0 auto;
					text-align: center;
					transition-duration: 150ms;
				}

				&.ext-wikilambda-editor-complete {
					color: #000;

					& span:after {
						background: #000;
						color: #fff;
						border-color: #000;
					}
				}

				&.ext-wikilambda-editor-active {
					color: #000;

					& span:after {
						color: #000;
						border-color: #000;
					}
				}
			}
		}

		.ext-wikilambda-editor-tabs {
			list-style: none;
			padding: 0;
			margin: 0;

			li {
				display: inline-block;
				padding: 0.5em 1em;
				color: #ccc;
				border-bottom: 1px solid #ccc;

				a {
					color: #ccc;
				}

				&.ext-wikilambda-editor-complete {
					color: #000;

					a {
						color: #000;
					}
				}

				&:hover,
				&.ext-wikilambda-editor-active {
					color: #000;
					border-bottom: 1px solid #000;

					a {
						color: #000;
					}
				}
			}
		}
	}

	main {
		position: relative;
		flex: 0 1 100%;
		margin: 0 3em;
		display: flex;
		flex-direction: column;

		section {
			width: 80%;
			margin: 45px auto;

			input.ext-wikilambda-text-input {
				width: 100%;
				padding: 0.5em 1em;
				box-sizing: border-box;
			}
		}

		.ext-wikilambda-editor-description {
			font-size: 0.9em;
			margin: 0.5em 0;
		}

		.ext-wikilambda-editor-controls {
			display: flex;
			justify-content: end;
			padding-top: 1.5em;

			* {
				margin: 0 0.5em;
			}
		}
	}

	/* Currently unused, but we might bring this back. */
	&.ext-wikilambda-editor-three-cols {
		grid-template-columns: 200px 1fr 300px;

		.ext-wikilambda-editor-horizontal-progress-list {
			display: none;
		}

		.ext-wikilambda-editor-progress-list li.ext-wikilambda-editor-step span {
			display: block;
		}
	}

	&.ext-wikilambda-editor-two-cols {
		grid-template-columns: 1fr 300px;

		.ext-wikilambda-editor-vertical-progress-list {
			display: none;
		}

		& > aside:first-child {
			grid-column: 1 e( '/' ) span 2;
			background: @background-color-base;

			.ext-wikilambda-editor-progress-list {
				display: flex;
				flex-direction: row;
				justify-content: space-around;

				&.ext-wikilambda-editor-tabs li {
					text-align: center;
					width: 100%;
					transition-duration: 150ms;
				}

				li.ext-wikilambda-editor-step {
					display: flex;
					width: 100%;
					justify-content: center;

					.ext-wikilambda-editor-step-link-disabled {
						opacity: 0.5;
						pointer-events: none;
					}

					span {
						background: @background-color-base;
						padding: 0 3em 0 0.5em;
						z-index: 2;
					}

					&:not( :first-child ):before {
						position: absolute;
						top: 50%;
						left: -50%;
						border-bottom: 1px solid #ccc;
						content: '';
						width: calc( 100% - 3em );
						z-index: 1;
						transition-duration: 150ms;
					}

					&.ext-wikilambda-editor-active:not( :first-child ):before,
					&.ext-wikilambda-editor-complete:not( :first-child ):before {
						border-bottom: 1px solid #000;
					}
				}
			}
		}

		& > main {
			grid-row-start: 2;
		}

		& > aside:last-child {
			grid-row-start: 2;
			grid-column-start: 2;
		}
	}
}
</style>
