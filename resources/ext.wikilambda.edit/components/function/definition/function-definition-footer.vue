<template>
	<!--
		WikiLambda Vue component footer for the Function Editor, including publish, cancel and implement buttons.

		@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
		@license MIT
	-->
	<div class="ext-wikilambda-function-definition-footer">
		<label for="ext-wikilambda-function-definition-name__input" class="ext-wikilambda-app__text-regular">
			{{ $i18n( 'wikilambda-function-definition-footer-label' ).text() }}
		</label>
		<input
			v-model="summary"
			class="ext-wikilambda-function-definition-footer__text-input"
			:aria-label="$i18n( 'wikilambda-function-definition-footer-label' )"
			:placeholder="$i18n( 'wikilambda-function-definition-footer-placeholder' )"
		>
		<div class="ext-wikilambda-function-definition-footer__actions">
			<button
				:class="publishButtonStyle"
				:disabled="!publishButtonValidity"
				@click="handlePublish"
			>
				{{ $i18n( 'wikilambda-publishnew' ) }}
			</button>
			<button
				v-if="isEditing"
				:class="implementationButtonStyle"
				:disabled="!implementationButtonValidity"
				@click="handleImplementation"
			>
				{{ $i18n( 'wikilambda-function-definition-footer-implementation-button' ) }}
			</button>
			<!-- TODO: The following is just a placeholder until it is possible to attach implementation / Testers -->
			<button
				v-if="!isNewZObject"
				:class="implementationButtonStyle"
				@click="handleFallbackClick"
			>
				{{ $i18n( 'wikilambda-fallback' ) }}
			</button>
			<button
				class="ext-wikilambda-function-definition-footer__actions__cancel"
				@click="handleCancel"
			>
				{{ $i18n( 'wikilambda-cancel' ) }}
			</button>
		</div>
	</div>
</template>

<script>
var Constants = require( '../../../Constants.js' ),
	mapGetters = require( 'vuex' ).mapGetters,
	mapActions = require( 'vuex' ).mapActions;

// @vue/component
module.exports = {
	name: 'function-definition-footer',
	props: {
		isEditing: {
			type: Boolean
		}
	},
	data: function () {
		return {
			summary: ''
		};
	},
	computed: $.extend( mapGetters( [
		'currentZFunctionHasInputs',
		'currentZFunctionHasOutput'
	] ),
	{
		publishButtonValidity: function () {
			// publish button is only valid if function has inputs and outputs defined
			// TODO: this should also reset if there are local changes on an already published function
			return this.currentZFunctionHasInputs && this.currentZFunctionHasOutput;
		},
		publishButtonStyle: function () {
			return this.publishButtonValidity ?
				'ext-wikilambda-function-definition-footer__actions__valid-publish' :
				'ext-wikilambda-function-definition-footer__actions__invalid';
		},
		implementationButtonValidity: function () {
			// can only create an implementation if this is a published function
			return this.isEditing;
		},
		implementationButtonStyle: function () {
			return this.implementationButtonValidity ?
				'ext-wikilambda-function-definition-footer__actions__valid-implementation' :
				'ext-wikilambda-function-definition-footer__actions__invalid';
		}
	} ),
	methods: $.extend( {},
		mapActions( [ 'submitZObject' ] ),
		{
			handleCancel: function () {
				this.$router.go( -1 );
			},
			handleImplementation: function () {
				this.$router.push( {
					name: 'functionImplementation',
					query: {
						type: 'newDesign',
						zid: Constants.Z_FUNCTION
					}
				} );
			},
			handlePublish: function () {
				// TODO (T297330): include legal text when ready
				this.submitZObject( this.summary ).then( function ( pageTitle ) {
					if ( pageTitle ) {
						window.location.href = new mw.Title( pageTitle ).getUrl();
					} else {
						this.$emit( 'publish-successful', this.$i18n( 'wikilambda-function-definition-publish-successful-message' ).text() );
					}
				} );
			},
			handleFallbackClick: function () {
				var query = {
					type: 'fallback',
					zid: Constants.Z_FUNCTION
				};
				this.$router.push( { name: this.$route.name, query: query } );
			}
		}
	)
};

</script>

<style lang="less">
@import '../../../ext.wikilambda.edit.less';

.ext-wikilambda-function-definition-footer {
	display: flex;
	flex-direction: column;
	background-color: @wmui-color-base90;
	padding: 30px;

	&__text-input {
		padding: 6px 8px;
		margin-top: 10px;
		margin-bottom: 10px;
	}

	&__actions {
		display: flex;

		button {
			padding: 5px;
			margin: 5px;
			border-radius: 2px;
			cursor: pointer;
		}

		&__valid-publish {
			background-color: @wmui-color-accent50;
			color: @wmui-color-base100;
			border: 0;
		}

		&__published {
			background-color: @wmui-color-accent90;
			border: 0;
		}

		&__valid-implementation {
			color: @wmui-color-base10;
			background-color: @wmui-color-base90;
			border: 1px solid @wmui-color-base50;
		}

		&__cancel {
			color: @wmui-color-red50;
			border: 0;
		}

		&__invalid {
			background-color: @wmui-color-base70;
			color: @wmui-color-base100;
			border: 0;
		}

		input {
			width: 300px;
			height: 20px;
			padding: 4px 6px;
		}
	}
}
</style>
