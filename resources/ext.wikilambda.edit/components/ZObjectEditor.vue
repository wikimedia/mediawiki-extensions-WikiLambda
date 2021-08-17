<template>
	<!--
		WikiLambda Vue interface module for top-level editor encapsulation.

		@copyright 2020–2021 WikiLambda team; see AUTHORS.txt
		@license MIT
	-->
	<!-- TODO: Add a loading indicator, once T254695 is done upstream. -->
	<div id="ext-wikilambda-editor">
		<z-object
			:persistent="true"
			@input="updateZobject"
		></z-object>
		<template v-if="showSaveCommand">
			<div>
				<!-- TODO: Replace this with a full save dialog (copywarn, IPwarn, minor edit box, …)? -->
				<label for="summary"> {{ $i18n( 'wikilambda-summarylabel' ) }} </label>
				<input v-model="summary"
					class="ext-wikilambda-editSummary"
					name="summary"
				>
			</div>
			<button @click="submit">
				{{ submitButtonLabel }}
			</button>
		</template>
		<button @click="$store.dispatch( 'toggleExpertMode' )">
			<template v-if="$store.getters.isExpertMode">
				{{ $i18n( 'wikilambda-disable-expert-mode' ) }}
			</template>
			<template v-else>
				{{ $i18n( 'wikilambda-enable-expert-mode' ) }}
			</template>
		</button>
		<sd-message v-if="message.text" :type="message.type">
			{{ message }}
		</sd-message>
	</div>
</template>

<script>
var ZObject = require( './ZObject.vue' ),
	SdMessage = require( './base/Message.vue' ),
	mapGetters = require( 'vuex' ).mapGetters,
	mapActions = require( 'vuex' ).mapActions,
	ZObjectJson = require( './ZObjectJson.vue' );

module.exports = {
	name: 'ZObjectEditor',
	components: {
		'z-object': ZObject,
		'sd-message': SdMessage,
		'z-object-json': ZObjectJson
	},
	data: function () {
		return {
			summary: ''
		};
	},
	computed: $.extend( mapGetters( {
		createNewPage: 'isCreateNewPage',
		message: 'getZObjectMessage',
		ZObjectJson: 'getZObjectAsJson'
	} ), {
		submitButtonLabel: function () {
			if ( this.createNewPage ) {
				return mw.msg(
					mw.config.get( 'wgEditSubmitButtonLabelPublish' ) ?
						'wikilambda-publishnew' : 'wikilambda-savenew'
				);
			} else {
				return mw.msg(
					mw.config.get( 'wgEditSubmitButtonLabelPublish' ) ?
						'wikilambda-publishchanges' : 'wikilambda-savechanges'
				);
			}
		},
		showSaveCommand: function () {
			// TODO: Move this into its own vuex store as things gets more complicated and more view settigns are set
			// we currently hide the save command for evaluate function call.
			return mw.config.get( 'wgCanonicalSpecialPageName' ) !== 'EvaluateFunctionCall';
		}
	} ),
	methods: $.extend( {},
		mapActions( [ 'initialize', 'submitZObject' ] ),
		{
			updateZobject: function ( newZobject ) {
				this.zobject = newZobject;
			},

			submit: function () {
				this.submitZObject( this.summary );
			}
		}
	),

	created: function () {
		this.initialize();
	}
};
</script>

<style lang="less">
.ext-wikilambda-editSummary {
	width: 100%;
}

.ext-wikilambda-editor-nojswarning {
	display: none;
}
</style>
